;; Contents of this plugin will be reset by Kite on start. Changes you make
;; are not guaranteed to persist.

;; TODO
;; * test using emacs batch mode
;; * log errors in a way that we will be able to give users instructions to find them
;; * disable self if anything goes wrong

(defvar kite-plugin-id
  (concat "emacs_"  emacs-version  "_" (number-to-string (emacs-pid)))
  "id of this elisp plugin.")

(defvar kite-max-packet-size 262143 "Max number of chars to send in one UDP packet.")

(defvar kite-in-hook nil "True if we are currently in a hook (prevents infinite loops).")

(defvar kite-prev-point 0
  "Holds the cursor position from the last run of post-command-hooks.")

(make-variable-buffer-local 'kite-prev-point)

(defvar kite-socket-path "~/.kite/kite.sock" "path to unix domain socket")

(defvar kite-udswrite-path "~/.kite/emacs/udswrite" "path to udswrite binary")

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
  "Determines whether the cursor position changed since the last call to
  kite-checkpoint-buffer-state."
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
                      (cons "pluginId" kite-plugin-id)
                      (cons "text" (buffer-string))
                      )))

(defun kite-surface ()
  (kite-marshal (list (cons "source" "emacs")
                      (cons "action" "surface"))))

(defun kite-send (message)
  "Check status of socket and send a message if possible"
  (if (< (length message) kite-max-packet-size)
      (call-process kite-udswrite-path nil nil nil (expand-file-name kite-socket-path) message)
    (kite-log "unable to send message because length exceeded limit")))

;;
;; Hooks
;;

(defun kite-handle-focus-in ()
  "Called when the user switches to the emacs window."
  (if (not (kite-ignore-buffer))
      (kite-send (kite-message "focus"))
    (kite-send (kite-surface))))

(defun kite-handle-focus-out ()
  "Called when the user switches away from the emacs window."
  (unless (kite-ignore-buffer)
    (kite-send (kite-message "lost_focus"))))

(defun kite-handle-after-change (begin end oldlength)
  (if (kite-ignore-buffer)
      (kite-send (kite-surface))
    (unless kite-in-hook
      (setq kite-in-hook t)
      (kite-send (kite-message "edit"))
      (kite-checkpoint-buffer-state)
      (setq kite-in-hook nil))))

(defun kite-handle-buffer-list-update ()
  "Called when the user switches between buffers."
  (if (kite-ignore-buffer)
      (kite-send (kite-surface))
    (unless kite-in-hook
      (setq kite-in-hook t)
      (kite-send (kite-message "selection"))
      (setq kite-in-hook nil))))

(defun kite-handle-post-command ()
  "Called when the user issues any command"
  (if (kite-ignore-buffer)
      (kite-send (kite-surface))
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
  "Setup Kite connection and hooks."
  (interactive)
  (kite-add-hooks))

(defun kite-stop ()
  "Remove hooks and clean up socket."
  (interactive)
  (kite-remove-hooks))

(kite-init)

(provide 'kite)
