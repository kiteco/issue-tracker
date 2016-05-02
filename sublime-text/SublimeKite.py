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
PLUGIN_ID = "sublime%s" % str(PYTHON_VERSION)

FIX_APPLY_ERROR = """It is with great regret we must inform you that we cannot apply the suggested fix. Please contact support@kite.com if the problem persists.

- Kite Team
"""


class SublimeKite(sublime_plugin.EventListener, threading.Thread):
    # Path to outgoing socket
    SOCK_PATH = os.path.expandvars("$HOME/.kite/kite.sock")

    # Directory where kited will look for sockets to send events to us,
    # based on PLUGIN_ID
    SOCK_LISTEN_DIR = os.path.expandvars("$HOME/.kite/plugin_socks")
    SOCK_BUF_SIZE = 2 << 20  # 2MB

    # Write to unix domain socket

    def _get_sock(self):
        sock = getattr(self, '_sock', None)
        if sock is None:
            sock = socket.socket(socket.AF_UNIX,
                                 socket.SOCK_DGRAM)
            sock.setsockopt(socket.SOL_SOCKET,
                            socket.SO_SNDBUF, self.SOCK_BUF_SIZE)
            setattr(self, '_sock', sock)

            # Start read thread, defined by run()
            self.start()

        return sock

    def _write_sock(self, payload):
        try:
            sock = self._get_sock()
            sock.sendto(payload, self.SOCK_PATH)
        except Exception as e:
            print("sock.sendto exception: %s" % e)

    # Implements run from threading.Thread. This is used for reading from
    # the domain socket via _read_loop()
    def run(self):
        listen_sock = os.path.join(self.SOCK_LISTEN_DIR, PLUGIN_ID)
        if os.path.exists(listen_sock):
            os.remove(listen_sock)

        sock = socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM)
        sock.bind(listen_sock)

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
        full_region = sublime.Region(0, view.size())
        full_text = view.substr(full_region)
        selections = [{'start': r.a, 'end': r.b} for r in view.sel()]

        json_body = json.dumps({
            'source': 'sublime-text',
            'action': action,
            'filename': realpath(view.file_name()),
            'selections': selections,
            'text': full_text,
            'pluginId': PLUGIN_ID,
        })

        if PYTHON_VERSION >= 3:
            json_body = bytes(json_body, "utf-8")

        self._write_sock(json_body)

    def _error(self, data):
        view = sublime.active_window().active_view()
        json_body = json.dumps({
            'source': 'sublime-text',
            'action': "error",
            'filename': realpath(view.file_name()),
            'text': json.dumps(data),
            'pluginId': PLUGIN_ID,
        })

        if PYTHON_VERSION >= 3:
            json_body = bytes(json_body, "utf-8")

        self._write_sock(json_body)

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
