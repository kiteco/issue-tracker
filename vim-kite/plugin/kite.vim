" This plugin sets up a few event handlers that allow it to function with Kite

function! PyKiteEvent(action)
    let l:filename = expand("%:p")
    let l:nvim = has('nvim')
KitePython << endpython
import vim
import os
import json
import threading


PYTHON3 = sys.version_info >= (3,)

if PYTHON3:
    from queue import Queue, Full
else:
    from Queue import Queue, Full


SOURCE = 'nvim' if int(vim.eval('l:nvim')) else 'vim'

KITED_HOSTPORT = "127.0.0.1:46624"
EVENT_ENDPOINT = "/clientapi/editor/event"
HTTP_TIMEOUT = 0.09  # timeout for HTTP requests in seconds
EVENT_QUEUE_SIZE = 3  # small queue because we want to throw away old events

LOG_FILE = os.path.expanduser("~/.kite/logs/vim-plugin.log")
VERBOSE = False


def log(*args):
    """
    Print a log message
    """
    try:
        with open(LOG_FILE, "a") as f:
            f.write(" ".join(map(str, args)) + "\n")
    except:
        pass


def verbose(*args):
    """
    Print a log message (or noop if verbose mode is off)
    """
    if VERBOSE:
        log(*args)


def cursor_pos(buf, pos):
    """
    Get the cursor position as an offset from the beginning of the file
    """
    (line, col) = pos
    return sum(len(l) for l in buf[:line-1]) + col + (line-1)


def realpath(p):
    """
    Evaluate any symlinks and return a symlink-free path
    """
    try:
        return os.path.realpath(p)
    except:
        return p


def event_loop():
    """
    Read events from the event queue and send them to kited via HTTP
    """
    while True:
        ev = event_queue.get(block=True)
        if ev == None:  # this is the stop signal
            verbose("event_queue recieved stop signal")
            break
        http_roundtrip(EVENT_ENDPOINT, ev)


def http_roundtrip(endpoint, payload):
    """
    Send a json payload to kited at the specified endpoint
    """
    try:
        verbose("sending to", endpoint, ":", payload)
        req = json.dumps(payload)

        if PYTHON3:
            import http.client
            conn = http.client.HTTPConnection(KITED_HOSTPORT, timeout=HTTP_TIMEOUT)
            conn.request("POST", endpoint, body=req.encode('utf-8'))
            response = conn.getresponse()
            resp = response.read().decode('utf-8')
            conn.close()
        else:
            import urllib2
            url = "http://" + KITED_HOSTPORT + endpoint
            conn = urllib2.urlopen(url, data=req, timeout=HTTP_TIMEOUT)
            resp = conn.read()
            conn.close()

        verbose("response was:", resp)

    except Exception as ex:
        verbose("error during http roundtrip to %s: %s" % (endpoint, ex))
        return None


def enqueue_event(action, filename):
    """
    Add an event for the current buffer state to the outgoing queue
    """
    verbose("at enqueue_event:", action)
    pos = cursor_pos(list(vim.current.buffer), vim.current.window.cursor)

    event = {
        'source': SOURCE,
        'action': action,
        'filename': realpath(filename),
        'text': '\n'.join(vim.current.buffer),
        'selections': [{'start': pos, 'end': pos}],
    }

    if len(event['text']) > (1 << 20): # 1mb
        event['action'] = 'skip'
        event['text'] = 'file_too_large'

    try:
        event_queue.put(event, block=False)
    except Full:
        verbose("event queue was full")


# start the outgoing event loop
try:
    event_queue
except NameError:
    verbose("starting event queue...")
    event_queue = Queue(maxsize=EVENT_QUEUE_SIZE)
    event_thread = threading.Thread(target=event_loop)
    event_thread.start()

enqueue_event(vim.eval("a:action"), vim.eval("l:filename"))

endpython
endfunction


function! PyKiteShutdown()
KitePython << endpython

verbose("sending stop signal to event_queue")
event_queue.put(None, block=False)

endpython
endfunction


" use a version of python that exists in the current vim build
if has('python')
    command! -nargs=1 KitePython python <args>
elseif has('python3')
    command! -nargs=1 KitePython python3 <args>
endif

if has('python') || has('python3')
    augroup KitePlugin
        autocmd VimLeavePre  * :call PyKiteShutdown()
        autocmd CursorMoved  * :call PyKiteEvent('selection')
        autocmd CursorMovedI * :call PyKiteEvent('edit')
        autocmd BufEnter     * :call PyKiteEvent('focus')
        autocmd FocusGained  * :call PyKiteEvent('focus')
        autocmd BufLeave     * :call PyKiteEvent('lost_focus')
    augroup END
endif
