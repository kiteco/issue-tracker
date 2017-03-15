" This plugin sets up a few event handlers that allow it to function with Kite


function! PyKiteEvent(action)
    let l:filename = expand("%:p")
    let l:nvim = has('nvim')
KitePython << endpython
import vim
import os
import json


PYTHON3 = sys.version_info >= (3,)
SOURCE = 'nvim' if int(vim.eval('l:nvim')) else 'vim'

KITED_HOSTPORT = "127.0.0.1:46624"
EVENT_ENDPOINT = "/clientapi/editor/event"
HTTP_TIMEOUT = 0.09  # timeout for HTTP requests in seconds

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
    (line, col) = pos
    return sum(len(l) for l in buf[:line-1]) + col + (line-1)


def realpath(p):
    try:
        return os.path.realpath(p)
    except:
        return p


def http_roundtrip(endpoint, payload):
    """
    Send a json payload to kited at the specified endpoint
    """
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


def send_event(action, filename):
    verbose("at send_event:", action)
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
        http_roundtrip(EVENT_ENDPOINT, event)
    except Exception as ex:
        verbose("error during http roundtrip to %s: %s" % (endpoint, ex))


send_event(vim.eval("a:action"), vim.eval("l:filename"))
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
        autocmd CursorMoved  * :call PyKiteEvent('selection')
        autocmd CursorMovedI * :call PyKiteEvent('edit')
        autocmd BufEnter     * :call PyKiteEvent('focus')
        autocmd FocusGained  * :call PyKiteEvent('focus')
        autocmd BufLeave     * :call PyKiteEvent('lost_focus')
    augroup END
endif
