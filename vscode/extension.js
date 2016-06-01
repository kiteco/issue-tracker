'use strict';

// Contents of this plugin will be reset by Kite on start. Changes you make
// are not guaranteed to persist.

const vscode = require('vscode');
const dgram = require('dgram');
const crypto = require('crypto');

var PLUGIN_ID = null;
const SOURCE = "vscode";
const MAX_TEXT_SIZE = Math.pow(2, 20);

function activate (context) {
    console.log('KiteCode is now active');
    
    let incoming = new KiteIncoming();
    let outgoing = new KiteOutgoing();
    let eventController = new KiteEventController(incoming, outgoing);
    
    context.subscriptions.push(incoming);
    context.subscriptions.push(outgoing);
    context.subscriptions.push(eventController);
};

// Called when VSCode is shut down.
function deactivate () {
    console.log('bye');
};

// Builds a UDP bridge and listens for events from Kite.
var KiteOutgoing = class {
    static get HOST () {
        return "127.0.0.1";
    };
    
    static get PORT () {
        return 46625;
    };
    
    constructor () {
        this.outgoingSocket = dgram.createSocket("udp4");
    };
    
    // Builds a kite event based on action. An action being
    // an edit, a selection, or a focus.
    buildKiteEvent (action) {
        const editor = vscode.window.activeTextEditor;
        
        if (!editor) {
            return null;
        }
        
        let text = editor.document.getText();
        
        if (text.length > MAX_TEXT_SIZE) {
            return {
                "source": SOURCE,
                "action": "skip",
                "filename": editor.document.fileName,
                "text": "file_too_large",
                "pluginId": PLUGIN_ID,
            };
        }
        
        let cursorPoint = editor.selection.active;
        let cursorOffset = this.pointToOffset(text, cursorPoint);
        
        return {
            "source": SOURCE,
            "action": action,
            "filename": editor.document.fileName,
            "text": text,
            "pluginId": PLUGIN_ID,
            "selections": [{
                "start": cursorOffset,
                "end": cursorOffset,
            }],
        };
    };
    
    pointToOffset (text, point) {
        let lines = text.split("\n");
        var total = 0;
        
        for (var i = 0; i < lines.length && i < point.line; i++) {
            total += lines[i].length;
        }
        
        total += point.character + point.line;
        return total;
    };
    
    // Sends an event to Kite.
    sendEvent (action) {
        let event = this.buildKiteEvent(action);
        let msg = JSON.stringify(event);

        this.outgoingSocket.send(msg, 0, msg.length, KiteOutgoing.PORT, KiteOutgoing.HOST);
    };
    
    // Sends an error to Kite.
    sendError (data) {
        const editor = vscode.window.activeTextEditor;
        
        if (!editor) {
            return;
        }
        
        let event = {
            'source': SOURCE,
            'action': "error",
            'filename': editor.document.fileName,
            'text': JSON.stringify(data),
            'pluginId': PLUGIN_ID
        }
        
        let msg = JSON.stringify(event);
        this.outgoingSocket.send(msg, 0, msg.length, KiteOutgoing.PORT, KiteOutgoing.HOST);
    };
    
    // Fired on any edit event.
    onEdit (event) {
       this.sendEvent("edit");
    };
    
    // Fired when a user highlights or selects a keyword.
    onSelection (event) {
       this.sendEvent("selection"); 
    };
    
    // Fired when a user selects a different pane.
    onEditorChange (event) {
        this.sendEvent("focus");
    };
};

var KiteIncoming = class {
    constructor () {
        this.highlights = vscode.languages.createDiagnosticCollection("kite-highlights");
        
        this.incomingSocket = dgram.createSocket("udp4");
        this.incomingSocket.on('listening', this.listening.bind(this));
        this.incomingSocket.on('message', this.message.bind(this));
        this.incomingSocket.on('error', this.error.bind(this));
        this.incomingSocket.on('close', this.close.bind(this));
        
        this.incomingSocket.bind(0, "127.0.0.1");
        
        // Set in the event controller.
        this.kiteOutgoing = undefined;
    };
    
    listening () {
        let addr = this.incomingSocket.address();
        PLUGIN_ID = "udp://" + addr.address + ":" + addr.port;
        console.log("UDP Server listening on", PLUGIN_ID);
    };
    
    message (msg, rinfo) {
        let data = JSON.parse(msg.toString());
        this.handleSuggestion(data);
    };
    
    error (error) {
        console.log("UDP Server error:", error);
    };
    
    close () {
        console.log("Closing");
    };
    
    // Kite will send back suggestions. Depending on its type,
    // we handle it in one of three different ways: 
    // an 'apply':
    //      - applies the suggested fix onto the active editor.
    // a 'highlight':
    //      - instructs the editor to highlight a range of code.
    // a 'clear':
    //      - instructs the editor to clear any highlights added
    //      to the editor.
    handleSuggestion (suggestion) {
        let suggestionType = suggestion['type'];
        if (suggestionType === 'apply') {
            this.handleApply(suggestion);
        } else if (suggestionType === 'highlight') {
            this.handleHighlight(suggestion);
        } else if (suggestionType === 'clear') {
            this.handleClear(suggestion);
        }
    };
    
    // Applies a suggested fix onto the currently active editor.
    handleApply (suggestion) {
        if (!this.validBuffer(suggestion)) {
            return;
        }
        
        const editor = vscode.window.activeTextEditor;
        
        if (!editor) {
            return;
        }
        
        for (var i = 0; suggestion.diffs && i < suggestion.diffs.length; i++) {
            let diff = suggestion.diffs[i];            
            editor.edit(function (editBuilder) {
                let startPosition = new vscode.Position(diff.linenum - 1, 0);
                let endPosition = new vscode.Position(diff.linenum - 1, diff.line_src.length);
                let removedRange = new vscode.Range(startPosition, endPosition);
                editBuilder.replace(removedRange, diff.line_dest.trimRight());
            });
        }
        
        this.handleClear();
    };
        
    // Adds a highlight.
    handleHighlight (suggestion) {
        if (!this.validBuffer(suggestion)) {
            return;
        }
        
        const editor = vscode.window.activeTextEditor;
        
        if (!editor) {
            return;
        }
        
        let allHighlights = [];
        let documentUri = editor.document.uri;
        let documentText = editor.document.getText();
        
        for (var i = 0; suggestion.diffs && i < suggestion.diffs.length; i++) {
           let diff = suggestion.diffs[i];
           
           // Build the start and end position of the highlight before adding it.
           let startPosition = this.buildHighlightPosition(diff.begin, diff.linenum, documentText);
           let endPosition = this.buildHighlightPosition(diff.end, diff.linenum, documentText);
           
           let range = new vscode.Range(startPosition, endPosition);
           let highlight = new vscode.Diagnostic(range, diff.line_dest, vscode.DiagnosticSeverity.Error);
           
           allHighlights.push(highlight);
        }
        
        this.highlights.set(documentUri, allHighlights);
    };
    
    handleClear (suggestion) {
        this.highlights.clear();
    };

    // Kite's highlights provide positions that are absolutely indexed relative to the entire text.
    // Visual Studio's Diagnostic highlights expects the position to be relative to the line. 
    buildHighlightPosition (position, linenum, text) {
        var remainingCharacters = position;
        let lines = text.split("\n");
    
        // Iterate until we get to the position of the character we need, and then build
        // a relative vscode.Position.
        for (var i = 0; i < lines.length; i++) {
            let charactersInLine = lines[i].length + 1; // +1 for the newline at the end of 

            if (remainingCharacters - charactersInLine < 0) {
                return new vscode.Position(linenum - 1, remainingCharacters)
            }
                
            remainingCharacters = remainingCharacters - charactersInLine;
        }

        // If we get here, there's probaly a buffer mismatch.        
        return undefined;
    };
    
    validBuffer (suggestion) {
        const editor = vscode.window.activeTextEditor;
        
        if (!editor) {                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          
            return false;
        }
        
        let text = editor.document.getText();
        let file_md5 = crypto.createHash("md5").update(text.toString()).digest("hex");
        let remote_md5 = suggestion.file_md5 || '';
        
        if (remote_md5 && remote_md5 !== file_md5) {
            console.log("buffer mismatch, remote:", remote_md5, "local:", file_md5);
            
            this.kiteOutgoing.sendError({
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
    };
};


// Listens for events from the editor and provides them to Kite.
var KiteEventController = class {
    constructor(incoming, outgoing) {
        this._incoming = incoming;
        this._outgoing = outgoing;
        
        // Incoming might need to send an error to Kite.
        incoming.kiteOutgoing = outgoing;
        
        let subscriptions = [];
            
        vscode.window.onDidChangeTextEditorSelection(this.onSelection, this, subscriptions);
        vscode.workspace.onDidChangeTextDocument(this.onEdit, this, subscriptions);
        vscode.window.onDidChangeActiveTextEditor(this.onEditorChange, this, subscriptions);
        
        this._disposable = vscode.Disposable.from(subscriptions);
    };
    
    dispose () {
        this._disposable.dispose();
    };
    
    // User selected some text.
    onSelection (event) {
        this._outgoing.onSelection(event);
    };
    
    // User edted some text.
    onEdit (event) {
        this._outgoing.onEdit(event);
    };
    
    // The text editor did change.
    onEditorChange (event) {
        this._outgoing.onEditorChange(event);
    };
};

exports.deactivate = deactivate;
exports.activate = activate;
exports.KiteOutgoing = KiteOutgoing;
exports.KiteIncoming = KiteIncoming;
exports.KiteEventController = KiteEventController;