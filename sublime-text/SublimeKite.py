# Contents of this plugin will be reset by Kite on start. Changes you make
# are not guaranteed to persist.

import json
import os
import pprint
import sublime
import sublime_plugin
import socket
import sys
import time
import threading
import traceback
import hashlib
import base64


PYTHON_VERSION = sys.version_info[0]

FIX_APPLY_ERROR = """It is with great regret we must inform you that we cannot apply the suggested fix. Please contact support@kite.com if the problem persists.

- Kite Team
"""

SUBLIME_VERSION = str(sublime.version())[0]
SOURCE = 'sublime%s' % SUBLIME_VERSION

KITED_HOSTPORT = "127.0.0.1:46624"
EVENT_ENDPOINT = "/clientapi/editor/event"
ERROR_ENDPOINT = "/clientapi/editor/error"


class SublimeKite(sublime_plugin.EventListener, threading.Thread):
    # Path to outgoing socket
    SOCK_PATH = os.path.expandvars("$HOME/.kite/kite.sock")
    SOCK_BUF_SIZE = 2 << 20  # 2MB

    # Plugin ID set by run() below
    PLUGIN_ID = ""

    # Implements run from threading.Thread. This is used for reading from
    # the domain socket via _read_loop()
    def run(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.bind(('127.0.0.1', 0))
        _, port = sock.getsockname()
        self.PLUGIN_ID = "udp://127.0.0.1:%d" % port

        while True:
            try:
                self._read_loop(sock)
            except Exception as e:
                print("read loop exception: %s" % e)

    def _read_loop(self, sock):
        while True:
            data = sock.recv(self.SOCK_BUF_SIZE)
            if PYTHON_VERSION >= 3:
                suggestion = json.loads(data.decode())
            else:
                suggestion = json.loads(data)

            pprint.pprint(suggestion)
            if suggestion['type'] == "apply":
                sublime.set_timeout(
                    lambda: self.apply_suggestion(suggestion), 0)
            elif suggestion['type'] == "highlight":
                sublime.set_timeout(
                    lambda: self.highlight_suggestion(suggestion), 0)
            elif suggestion['type'] == "clear":
                sublime.set_timeout(
                    lambda: self.clear_suggestion(suggestion), 0)

    def _region_key(self):
        return "kite_highlight"

    def apply_suggestion(self, suggestion):
        adj = 0
        view = sublime.active_window().active_view()

        full_region = sublime.Region(0, view.size())
        full_text = view.substr(full_region)
        full_text = full_text.encode('utf-8')
        file_md5 = hashlib.md5(full_text).hexdigest()

        remote_md5 = suggestion.get('file_md5', '')
        if remote_md5 == '' or remote_md5 == file_md5:
            for diff in suggestion['diffs']:
                # Compute adjustments so subsequent diffs apply correctly
                diff['begin'] += adj
                diff['end'] += adj
                adj += len(diff['destination']) - len(diff['source'])
                view.run_command('apply_suggestion', diff)
        else:
            msg = "error: local hash (%s) != remote hash (%s)" % (file_md5, remote_md5)
            self._error(msg)
            sublime.error_message(FIX_APPLY_ERROR)

        # Remove all highlights
        key = self._region_key()
        view.erase_regions(key)

    def highlight_suggestion(self, suggestion):
        view = sublime.active_window().active_view()
        for diff in suggestion['diffs']:
            key = self._region_key()
            view.add_regions(key, [sublime.Region(diff['begin'], diff['end'])],
                             "invalid", "dot", 0)

    def clear_suggestion(self, suggestion):
        view = sublime.active_window().active_view()
        for diff in suggestion['diffs']:
            key = self._region_key()
            view.erase_regions(key)

    # Events
    def on_modified(self, view):
        self._update('edit', view)

    def on_selection_modified(self, view):
        self._update('selection', view)

    def on_activated(self, view):
        self._update('focus', view)

    def on_deactivated(self, view):
        self._update('lost_focus', view)

    def _update(self, action, view):
        print("at _update")
        # Check view group and index to determine if in source code buffer
        w = view.window()
        if w is None:
            return
        group, index = w.get_view_index(view)
        if group == -1 and index == -1:
            return

        full_region = sublime.Region(0, view.size())
        full_text = view.substr(full_region)
        selections = [{'start': r.a, 'end': r.b} for r in view.sel()]

        # skip content over 1mb
        if len(full_text) > (1 << 20): # 1mb
            action = 'skip'
            full_text = 'file_too_large'

        self._send_json(EVENT_ENDPOINT, {
            'source': SOURCE,
            'action': action,
            'filename': realpath(view.file_name()),
            'selections': selections,
            'text': full_text,
            'pluginId': self.PLUGIN_ID,
        })

    def _error(self, msg):
        view = sublime.active_window().active_view()
        self._send_json(ERROR_ENDPOINT, {
            'source': SOURCE,
            'filename': realpath(view.file_name()),
            'message': msg,
        })
        print(msg)

    def _send_json(self, endpoint, payload):
        print("at _send_json")
        """
        Send a json payload to kited at the specified endpoint
        """
        try:
            print("sending to endpoint:", endpoint)
            data = json.dumps(payload)

            if PYTHON_VERSION >= 3:
                print("sending with python 3")
                import http.client
                conn = http.client.HTTPConnection(KITED_HOSTPORT)
                conn.request("POST", endpoint, body=data.encode('utf-8'))
                conn.close()
            else:
                import urllib2
                url = KITED_HOSTPORT + endpoint
                conn = urllib2.urlopen(url, method="POST", data=data)
                conn.close()
        except Exception as ex:
            print("unable to send json to kited: ", ex)


class ApplySuggestionCommand(sublime_plugin.TextCommand):
    def run(self, edit, begin=None, end=None, destination=None, **kwargs):
        self.view.replace(edit, sublime.Region(begin, end), destination)


def realpath(p):
    """
    realpath replaces symlinks in a path with their absolute equivalent
    """
    try:
        return os.path.realpath(p)
    except:
        return p
