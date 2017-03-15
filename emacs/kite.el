;; Contents of this plugin will be reset by Kite on start. Changes you make
;; are not guaranteed to persist.

;; TODO
;; * test using emacs batch mode
;; * log errors in a way that we will be able to give users instructions to find them
;; * disable self if anything goes wrong

(defvar kite-max-payload-size 2097152 "Max number of chars to send in one UDP packet.")

(defvar kite-in-hook nil "True if we are currently in a hook (prevents infinite loops).")

(defvar kite-prev-point 0
  "Holds the cursor position from the last run of post-command-hooks.")

(make-variable-buffer-local 'kite-prev-point)

;;
;; Logging
;;

(defun kite-log (str)
  "Print a message to the log"
  (message (format "[Kite] %s" str)))

;;
;; State management
;;

(defun kite-buffer-state-changed ()
  "Determines whether the cursor position changed since the last call to kite-checkpoint-buffer-state."
  (not (equal (point) kite-prev-point)))

(defun kite-checkpoint-buffer-state ()
  (setq kite-prev-point (point)))

(defun kite-ignore-buffer ()
  "Determines whether the current buffer is visiting a file (as opposed to *scratch or the minibuffer)"
  (null (buffer-file-name)))

;;
;; JSON Marshaling
;;

(defun kite-alist-p (list)
  "Non-null if and only if LIST is an alist with simple keys."
  (while (consp list)
    (setq list (if (and (consp (car list))
                        (atom (caar list)))
                   (cdr list)
                 'not-alist)))
  (null list))

(defvar kite-json-true :json-true "symbol representing true in json")
(defvar kite-json-false :json-false "symbol representing false in json")

(defvar kite-json-special-chars
  '((?\" . ?\")
    (?\\ . ?\\)
    (?/ . ?/)
    (?b . ?\b)
    (?f . ?\f)
    (?n . ?\n)
    (?r . ?\r)
    (?t . ?\t))
  "Characters which are escaped in JSON, with their elisp counterparts.")

(defun kite-comma-separate (strings)
  (mapconcat 'identity strings ","))

(defun kite-marshal-char (char)
  "Encode a character within a JSON string."
  (setq char (encode-char char 'ucs))
  (let ((control-char (car (rassoc char kite-json-special-chars))))
    (cond
     ;; Special JSON character (\n, \r, etc.).
     (control-char
      (format "\\%c" control-char))
     ;; ASCIIish printable character.
     ((and (> char 31) (< char 127))
      (format "%c" char))
     ;; Fallback: UCS code point in \uNNNN form.
     (t
      (format "\\u%04x" char)))))

(defun kite-marshal-string (string)
  (format "\"%s\"" (mapconcat 'kite-marshal-char string "")))

(defun kite-marshal-keyvalue (pair)
  (format "%s:%s" (kite-marshal (car pair)) (kite-marshal (cdr pair))))

(defun kite-marshal-list (list)
  (format "[%s]" (kite-comma-separate (mapcar 'kite-marshal list))))

(defun kite-marshal-dict (dict)
  (format "{%s}" (kite-comma-separate (mapcar 'kite-marshal-keyvalue dict))))

(defun kite-marshal (obj)
  (cond ((null obj) "null")
        ((eq obj t) "true")
        ((eq obj kite-json-true) "true")
        ((eq obj kite-json-false) "false")
        ((numberp obj) (format "%s" obj))
        ((stringp obj) (kite-marshal-string obj))
        ((kite-alist-p obj) (kite-marshal-dict obj))
        (t (kite-marshal-list obj))))

;;
;; Network protocol
;;

(defun kite-message (action)
  "Build a json string to send to kited"
  (kite-marshal (list (cons "source" "emacs")
                      (cons "action" action)
                      (cons "filename" (buffer-file-name (current-buffer)))
                      (cons "selections" (list (list (cons "start" (- (point) 1))
                                                     (cons "end" (- (point) 1)))))
                      (cons "text" (buffer-string))
                      )))

(defun kite-surface ()
  (kite-marshal (list (cons "source" "emacs")
                      (cons "action" "surface"))))

(defun kite-send (payload)
  "Send message to kited via HTTP POST"
  (if (< (length payload) kite-max-payload-size)
    (let ((url-request-method "POST")
        (url-request-extra-headers '(("Content-Type" . "application/json")))
        (url-request-data payload))
      (url-retrieve-synchronously "http://127.0.0.1:46624/clientapi/editor/event" 'kite-kill-url-buffer))
    (kite-log "unable to send message because length exceeded limit")))

(defun kite-kill-url-buffer (status)
  "Kill the buffer returned by `url-retrieve'."
  (message "at kite-kill-url-buffer")
  (kill-buffer (current-buffer)))

;;
;; Hooks
;;

(defun kite-handle-focus-in ()
  "Called when the user switches to the emacs window."
  (unless (kite-ignore-buffer)
    (unless kite-in-hook
      (setq kite-in-hook t)
      (kite-send (kite-message "focus"))
      (kite-send (kite-surface))
      (setq kite-in-hook nil))))

(defun kite-handle-focus-out ()
  "Called when the user switches away from the emacs window."
  (unless (kite-ignore-buffer)
    (unless kite-in-hook
      (setq kite-in-hook t)
      (kite-send (kite-message "lost_focus"))
      (setq kite-in-hook nil))))

(defun kite-handle-after-change (begin end oldlength)
  "Called when the user modifies the state of a buffer"
  (unless (kite-ignore-buffer)
    (unless kite-in-hook
      (setq kite-in-hook t)
      (kite-send (kite-message "edit"))
      (kite-checkpoint-buffer-state)
      (setq kite-in-hook nil))))

(defun kite-handle-buffer-list-update ()
  "Called when the user switches between buffers."
  (unless (kite-ignore-buffer)
    (unless kite-in-hook
      (setq kite-in-hook t)
      (kite-send (kite-message "selection"))
      (setq kite-in-hook nil))))

(defun kite-handle-post-command ()
  "Called when the user issues any command"
  (unless (kite-ignore-buffer)
    (unless kite-in-hook
      (setq kite-in-hook t)
      (when (kite-buffer-state-changed)
        (kite-send (kite-message "selection"))
        (kite-checkpoint-buffer-state))
      (setq kite-in-hook nil))))

;;
;; Initialization
;;

(defun kite-add-hooks ()
  "Register the hooks we need"
  (add-hook 'after-change-functions 'kite-handle-after-change)
  (add-hook 'focus-in-hook 'kite-handle-focus-in)
  (add-hook 'focus-out-hook 'kite-handle-focus-out)
  (add-hook 'post-command-hook 'kite-handle-post-command))

(defun kite-remove-hooks ()
  "Remove kite-related hooks"
  (remove-hook 'buffer-list-update-hook 'kite-handle-buffer-list-update)
  (remove-hook 'after-change-functions 'kite-handle-after-change)
  (remove-hook 'focus-in-hook 'kite-handle-focus-in)
  (remove-hook 'focus-out-hook 'kite-handle-focus-out))

(defun kite-init ()
  "Setup hooks."
  (interactive)
  (kite-add-hooks))

(defun kite-stop ()
  "Remove hooks."
  (interactive)
  (kite-remove-hooks))

(kite-init)

(provide 'kite)
