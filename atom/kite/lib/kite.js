// Contents of this plugin will be reset by Kite on start. Changes you make
// are not guaranteed to persist.

var dgram = require('dgram');
var crypto = require('crypto');
var fs = require('fs');
var child_process = require('child_process');
var process = require('process');

var DEBUG = false;

// PLUGIN_ID identifies this plugin so that Kite can send messages back to
// this plugin. KiteIncoming sets up a UDP server socket to listen to.
// PLUGIN_ID will have the form udp://localhost:<port>.
var PLUGIN_ID = null;

// KiteOutgoing contains logic for sending events to Kite in response to
// editor actions. We track edit, selections, and focus. These events
// are sent to a UDP server listening on 127.0.0.1:46625.
var KiteOutgoing = {
  UDP_HOST: "127.0.0.1",
  UDP_PORT: 46625,
  UDS_SOCK: process.env.HOME + '/.kite/kite.sock',
  UDS_WRITE: process.env.HOME + '/.kite/atom/udswrite',
  MAX_PACKET_SIZE: 262143,

  // NOTE: Ideally we'd set this w/ a 2MB socket buffer. Can't do this in nodejs AFAIK.
  OUTGOING_SOCK: dgram.createSocket("udp4"),

  PENDING_EVENTS: [],
  MERGE_CALLED: false,

  // setup callbacks for events we want to track for each editor instance
  observeEditor: function(editor) {
    editor.onDidChange(this.onEdit.bind(this, editor));
    editor.onDidChangeSelectionRange(this.onSelection.bind(this, editor));
  },

  // send an event to Kite. Because Atom likes to fire many selection and buffer
  // change events (and in strange orders), we actually accumulate all the events
  // and use setTimeout with a 0ms timeout to indicate when the events have stopped
  // firing. This works because nodejs is single-threaded and the setTimeout gets
  // scheduled after all other pending events have been handled. Once this happens,
  // we can call mergeEvents, which will pick the last event, and mark it as edit
  // if any of the events that occured for that keystroke was in fact an edit.
  send: function(event) {
    this.PENDING_EVENTS.push(event);
    if (!this.MERGE_CALLED) {
      this.MERGE_CALLED = true;
      setTimeout(this.mergeEvents.bind(this), 0);
    }
  },

  reset: function() {
    this.MERGE_CALLED = false;
    this.PENDING_EVENTS = [];
  },

  // called after a string of events have fired for a particular keystroke. We use this
  // to debounce the events - pick the last event and set it to edit of any of the events
  // we accumulated was in fact an edit.
  mergeEvents: function() {
    var event = this.PENDING_EVENTS[this.PENDING_EVENTS.length-1];
    for (var i = 0; i < this.PENDING_EVENTS.length; i++) {
      if (this.PENDING_EVENTS[i].action === "edit") {
        event.action = "edit";
      }
    }
    if (DEBUG) {
      console.log(event.action, event.filename, event.selections[0]);
    }
    var msg = JSON.stringify(event);
    if (msg.length > this.MAX_PACKET_SIZE) {
      console.log("unable to send message because length exceeded limit");
      this.reset();
      return;
    }
    var send = child_process.spawn(this.UDS_WRITE, [this.UDS_SOCK, msg]);
    if (DEBUG) {
      send.stdout.on('data', (data) => {
        console.log('udswrite stdout: ', String(data));
      });
      send.stderr.on('data', (data) => {
        console.log('udswrite stderr: ', String(data));
      });
      send.on('close', (code) =>{
        console.log('udswrite exit code: ', code);
      });
    }
    this.reset();
  },

  // sendError - sends error message to Kite
  sendError: function(data) {
    var editor = atom.workspace.getActiveTextEditor();
    if (!editor) {
      return;
    }
    var event = {
      'source': 'atom',
      'action': "error",
      'filename': fs.realpathSync(editor.getPath()),
      'text': JSON.stringify(data),
      'pluginId': PLUGIN_ID,
    };
    var msg = JSON.stringify(event);
    if (msg.length > this.MAX_PACKET_SIZE) {
      console.log("unable to send message because length exceeded limit");
      return;
    }
    var send = child_process.spawn(this.UDS_WRITE, [this.UDS_SOCK, msg]);
    if (DEBUG) {
      send.stdout.on('data', (data) => {
        console.log('udswrite stdout: ', String(data));
      });
      send.stderr.on('data', (data) => {
        console.log('udswrite stderr: ', String(data));
      });
      send.on('close', (code) =>{
        console.log('udswrite exit code: ', code);
      });
    }
  },

  // callback handlers to track edit/selection/focus events
  onFocus: function(item) {
    // HACK(tarak): Check to see if the item is in fact a TextEditor object by
    // checking if it has the "buffer" property. This ensures we only handle focus
    // events on editor objects, instead of Settings, etc. which return DOM elements for
    // this event.
    if (item && item.buffer) {
      this.send(this.buildEvent(item, "focus"));
    }
  },
  onEdit: function(editor) {
    this.send(this.buildEvent(editor, "edit"));
  },
  onSelection: function(editor) {
    this.send(this.buildEvent(editor, "selection"));
  },

  // buildEvent constructs an event from the provided editor. It sets the
  // "action" field of the event to the provided value.
  buildEvent: function(editor, action) {
    var text = editor.getText();
    var cursorPoint = editor.getCursorBufferPosition();
    var cursorOffset = this.pointToOffset(text, cursorPoint);

    // don't send content over 1mb
    if (text.length > (1 << 20)) {
      action = "skip";
      text = "file_too_large";
    }

    return {
      "source": "atom",
      "action": action,
      "filename": editor.getPath(),
      "text": text,
      "pluginId": PLUGIN_ID,
      "selections": [{
        "start": cursorOffset,
        "end": cursorOffset,
      }],
    };
  },
  // pointToOffet takes the contents of the buffer and a point object
  // representing the cursor, and returns a byte-offset for the cursor
  pointToOffset: function(text, point) {
    var lines = text.split("\n");
    var total = 0;
    for (var i = 0; i < lines.length && i < point.row; i++) {
      total += lines[i].length;
    }
    total += point.column + point.row; // we add point.row to add in all newline characters
    return total;
  },
};

// ----------------

var MARKER_PROPS = {"type": "highlight", "class": "highlight-red"};

// KiteIncoming handles incoming events from Kite - such as applying a suggested
// fix to the code.
var KiteIncoming = {
  INCOMING_SOCK: dgram.createSocket("udp4"),
  MARKERS: [],

  initialize: function() {
    this.INCOMING_SOCK.on('listening', this.listening.bind(this));
    this.INCOMING_SOCK.on('message', this.message.bind(this));
    this.INCOMING_SOCK.on('error', this.error.bind(this));
    this.INCOMING_SOCK.on('close', this.close.bind(this));
    // picks an available port. we inspect this port in the
    // "listening" callback.
    this.INCOMING_SOCK.bind(0, "127.0.0.1");
  },
  shutdown: function() {
    this.INCOMING_SOCK.close();
  },

  listening: function() {
    var addr = this.INCOMING_SOCK.address();
    PLUGIN_ID = "udp://" + addr.address + ":" + addr.port;
    console.log("udp server listening", PLUGIN_ID);
  },
  message: function(msg, rinfo) {
    var data = JSON.parse(msg.toString());
    this.handleSuggestion(data);
  },
  error: function(err) {
    console.log("udp server error:", err);
  },
  close: function() {
    console.log("udp server closed");
  },

  handleSuggestion: function(suggestion) {
    var type = suggestion['type'];
    if (type === "apply") {
      this.handleApply(suggestion);
    } else if (type === "highlight") {
      this.handleHighlight(suggestion);
    } else if (type === "clear") {
      this.handleClear(suggestion);
    }
  },

  validBuffer: function(suggestion) {
    var editor = atom.workspace.getActiveTextEditor();
    if (!editor) {
      return false;
    }
    var text = editor.getText();
    var file_md5 = crypto.createHash("md5").update(text.toString()).digest("hex");

    var remote_md5 = suggestion.file_md5 || '';
    if (remote_md5 !== '' && remote_md5 !== file_md5) {
      console.log("buffer mismatch, remote:", remote_md5, "local:", file_md5);
      KiteOutgoing.sendError({
        "message": "buffer mismatch",
        "user_buffer": text.toString('base64'),
        "user_md5": file_md5,
        "expected_md5": remote_md5,
        "expected_buffer": suggestion.file_base64 || '',
        "suggestion": suggestion,
      });
      return false;
    }
    return true;
  },

  handleApply: function(suggestion) {
    if (DEBUG) {
      console.log("apply", suggestion);
    }
    if (!this.validBuffer(suggestion)) {
      return;
    }

    var adj = 0;
    var editor = atom.workspace.getActiveTextEditor();
    if (!editor) {
      return;
    }
    for (var i = 0; suggestion.diffs && i < suggestion.diffs.length; i++) {
      var diff = suggestion.diffs[i];
      diff.begin += adj;
      diff.end += adj;

      var text = editor.getText();
      var range = this.rangeFromDiff(diff.begin, diff.end, text);
      if (range) {
        editor.setTextInBufferRange(range, diff.destination);
        adj += diff.destination.length - diff.source.length;
      }
    }
    this.handleClear();
  },

  handleHighlight: function(suggestion) {
    if (DEBUG) {
      console.log("highlight", suggestion);
    }
    if (!this.validBuffer(suggestion)) {
      return;
    }

    var editor = atom.workspace.getActiveTextEditor();
    if (!editor) {
      return;
    }
    for (var i = 0; suggestion.diffs && i < suggestion.diffs.length; i++) {
      var diff = suggestion.diffs[i];
      var text = editor.getText();
      var range = this.rangeFromDiff(diff.begin, diff.end, text);
      if (range) {
        var marker = editor.markBufferRange(range);
        var dec = editor.decorateMarker(marker, MARKER_PROPS);
        this.MARKERS.push(marker);
      }
    }
  },

  handleClear: function(suggestion) {
    if (DEBUG) {
      console.log("clear", suggestion);
    }
    for (var i = 0; i < this.MARKERS.length; i++) {
      this.MARKERS[i].destroy();
    }
    this.MARKERS = [];
  },

  rangeFromDiff: function(start, end, text) {
    var lines = text.split('\n');
    var startPoint = this.pointFromLines(start, lines);
    var endPoint = this.pointFromLines(end, lines);
    if (startPoint && endPoint) {
      return [startPoint, endPoint];
    }
    return null;
  },
  pointFromLines: function(offset, lines) {
    var total = 0;
    for (var i = 0; i < lines.length; i++) {
      if (total + lines[i].length >= offset) {
        return [i, offset - total];
      }
      total += lines[i].length + 1; // +1 for newline character
    }
    return null;
  },
};

// var Completions = {
//   selector: ".source.python",
//   getSuggestions: function(event) {
//     console.log("completions were requested:", event);
//     return new Promise(function (resolve, reject) {
//       var suggestion = {
//         text: "elephant"
//       };
//       resolve([suggestion]);
//     });
//   }
// };

var provider = require('./provider.coffee');

console.log("hello from kite.js");
console.log(provider);

module.exports = {
  outgoing: KiteOutgoing,
  incoming: KiteIncoming,
  activate: function() {
    console.log("in activate()");
    this.incoming.initialize();
    // observeTextEditors takes a callback that fires whenever a new
    // editor window is created. We use this to call "observeEditor",
    // which registers edit/selection based callbacks.
    atom.workspace.observeTextEditors(this.outgoing.observeEditor.bind(this.outgoing));

    // focus is tracked at the workspace level.
    atom.workspace.onDidChangeActivePaneItem(this.outgoing.onFocus.bind(this.outgoing));
  },
  getProvider: function() {
    console.log("in getProvider()");
    return provider;
  }
};
