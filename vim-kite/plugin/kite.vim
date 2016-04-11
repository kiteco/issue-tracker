" This plugin sets up a few event handlers that allow it to function with Kite

function! PyKiteListen()
    let l:filename = expand("%:p")
python << endpython
import vim
import os
import json
import threading
import uuid
import hashlib
import base64


class KiteIncoming(threading.Thread):
    EXIT = json.dumps({"type": "exit"})

    def __init__(self, sock_path, sock):
        super(KiteIncoming, self).__init__()
        self.running = True
        self.sock_path = sock_path
        self.sock = sock

    def stop(self):
        self.running = False
        # Send ourselves an exit event. This lets us avoid using
        # socket timeouts, which end up eating up CPU.
        self.sock.sendto(self.EXIT, self.sock_path)

    def run(self):
        while self.running:
            try:
                self._read_loop()
            except vim.error as e:
                print "vim error: %s" % e
            except Exception:
                pass

    def _read_loop(self):
        sock_buf_size = 2 << 20
        while self.running:
            data = self.sock.recv(sock_buf_size)
            suggestion = json.loads(data)

            if suggestion['type'] == "apply":
                self.apply_suggestion(suggestion)
            elif suggestion['type'] == "highlight":
                self.highlight_suggestion(suggestion)
            elif suggestion['type'] == "clear":
                self.clear_suggestion(suggestion)
            elif suggestion['type'] == "exit":
                return

    # Convet start, end byte offsets to offsets in the provided line
    def adjust_start_end(self, linenum, start, end):
        cb = vim.current.buffer
        offset = sum(len(l)+1 for l in cb[:linenum-1])
        return start-offset, end-offset

    def apply_suggestion(self, suggestion):
        full_text = '\n'.join(vim.current.buffer)
        full_text = full_text.encode('utf-8')
        file_md5 = hashlib.md5(full_text).hexdigest()

        remote_md5 = suggestion.get('file_md5', '')
        if remote_md5 != '' and remote_md5 != file_md5:
            self._error({
                "message": "buffer mismatch",
                "user_buffer": str(base64.b64encode(full_text)),
                "user_md5": file_md5,
                "expected_md5": remote_md5,
                "expected_buffer": suggestion.get('file_base64', ''),
                "suggestion": suggestion,
            })
            print("error: local hash (%s) != remote hash (%s)" %
                  (file_md5, remote_md5))
            return

        adj = 0
        lineadj = 0
        for diff in suggestion['diffs']:
            # Compute adjustments so subsequent diffs apply correctly
            diff['begin'] += adj
            diff['end'] += adj
            diff['linenum'] += lineadj

            adj += len(diff['destination']) - len(diff['source'])

            # If this is a missing import, just append the line
            # TODO(tarak): If missing import ever becomes more than a line
            # addition this will not work. It works for now though..
            if diff['type'] == "missing_import":
                cb = vim.current.buffer
                cb.append(str(diff['destination']), diff['linenum']-1)
                # Increment lineadj because we just added a line, and need
                # to update subsequent diffs.
                lineadj += 1
            else:
                start, end, linenum = diff['begin'], diff['end'], diff['linenum']
                start, end = self.adjust_start_end(linenum, start, end)

                # First move to the line we want to modify
                cmd = "normal! mq%dgg" % (linenum)
                vim.command(cmd)

                # The following cmd is vim-speak for:
                # - Mark cursor position to q
                # - Go to line number (Ngg)
                # - Go to begining of line (0)
                # - Jump ahead N columns
                # - Delete N charaters
                # - Go into insert mode (or append [A], see below)
                # - Insert new text
                # - Escape out of insert mode
                # - Return to mark q (original cursor position)

                # Check if the end of the diff region is the end of the line.
                # If it is, use "A" (append to end of line), otherwise, use regular insert mode (i)
                if end == len(vim.current.line):
                    cmd = "normal! %dgg0%dl%sA%s`q" % (linenum, start, 'vd'*(end-start), diff['destination'])
                else:
                    cmd = "normal! %dgg0%dl%si%s`q" % (linenum, start, 'vd'*(end-start), diff['destination'])
                vim.command(cmd)

            vim.command("redraw")
            send_event("edit", suggestion['filename'])

    def highlight_suggestion(self, suggestion):
        pass

    def clear_suggestion(self, suggestion):
        pass

    def _error(self, data):
        json_body = json.dumps({
            'source': 'vim',
            'action': "error",
            'text': json.dumps(data),
            'pluginId': PLUGIN_ID,
        })

        if PYTHON_VERSION >= 3:
            json_body = bytes(json_body, "utf-8")

        try:
            SOCK_PATH = os.path.expandvars("$HOME/.kite/kite.sock")
            uds = socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM)
            uds.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 2<<20) # 2mb
            uds.sendto(json_body, SOCK_PATH)
        except Exception:
            pass

# Test to see if PLUGIN_ID exists, if not, set it
try:
    PLUGIN_ID
    PYTHON_VERSION

except NameError:
    PLUGIN_ID = "vim-%s" % (str(uuid.uuid4()))
    PYTHON_VERSION = sys.version_info[0]

def setup_socket(plugin_id):
    listen_dir = os.path.expandvars("$HOME/.kite/plugin_socks")
    if not os.path.exists(listen_dir):
        os.makedirs(listen_dir)

    path = os.path.join(listen_dir, plugin_id)
    if os.path.exists(path):
        os.remove(path)

    sock = socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM)
    sock.bind(path)
    return path, sock

path, sock = setup_socket(PLUGIN_ID)
ki = KiteIncoming(path, sock)
ki.start()
endpython
endfunction

function! PyKiteShutdown()
python << endpython

# ki was created above in PyKiteListen
ki.stop()

# path points to the UDS socket (via setup_socket above in PyKiteListen)
# remove the socket on shutdown
if os.path.exists(path):
    os.remove(path)
endpython
endfunction

function! PyKiteEvent(action)
    let l:filename = expand("%:p")
python << endpython
import vim
import os
import json
import socket
import uuid

# Test to see if PLUGIN_ID exists, if not, set it
try:
    PLUGIN_ID
except NameError:
    PLUGIN_ID = "vim-%s" % (str(uuid.uuid4()))

def cursor_pos(buf, pos):
    (line, col) = pos
    return sum(len(l) for l in buf[:line-1]) + col + (line-1)

def realpath(p):
    try:
        return os.path.realpath(p)
    except:
        return p

def send_event(action, filename):
    pos = cursor_pos(list(vim.current.buffer),
                    vim.current.window.cursor)

    event = {
        'source': 'vim',
        'action': action,
        'filename': realpath(filename),
        'text': '\n'.join(vim.current.buffer),
        'selections': [{'start': pos, 'end': pos}],
        'pluginId': PLUGIN_ID,
    }

    if len(event['text']) > (1 << 20): # 1mb
        event['action'] = 'skip'
        event['text'] = 'file_too_large'

    try:
        SOCK_PATH = os.path.expandvars("$HOME/.kite/kite.sock")
        uds = socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM)
        uds.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 2<<20) # 2mb
        uds.sendto(json.dumps(event), SOCK_PATH)
    except Exception as e:
        pass

send_event(vim.eval("a:action"), vim.eval("l:filename"))
endpython
endfunction


if has('python')
    augroup KitePlugin
        autocmd VimEnter     * :call PyKiteListen()
        autocmd VimLeavePre  * :call PyKiteShutdown()
        autocmd CursorMoved  * :call PyKiteEvent('selection')
        autocmd CursorMovedI * :call PyKiteEvent('edit')
        autocmd BufEnter     * :call PyKiteEvent('focus')
        autocmd BufLeave     * :call PyKiteEvent('lost_focus')
    augroup END
endif
