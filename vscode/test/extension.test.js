/* global suite, test */

const assert = require('assert');
const vscode = require('vscode');
const sinon = require('sinon');

const Kite = require('../extension');

function insertSomeText (text) {
  return vscode.window.activeTextEditor.edit(function (editBuilder) {
    let position = new vscode.Position(0, 0);
    editBuilder.insert(position, text);
  });
}

describe("Kite Outgoing Tests", function () {
  let outgoing = undefined;
  let stubs = [];
  let spies = [];

  beforeEach(function () {
    outgoing = new Kite.KiteOutgoing();
  });

  afterEach(function () {
    // Restores any stubs created in the tests.
    for (var i = 0; i < stubs.length; i++) {
      stubs[i].restore();
    }

    // Restores any spies created in the tests.
    for (var i = 0; i < spies.length; i++) {
      spies[i].restore();
    }

    // Delete all the text inserted by any of the tests.
    let text = vscode.window.activeTextEditor.document.getText();
    vscode.window.activeTextEditor.edit((editBuilder) => {
      let startPosition = new vscode.Position(0, 0);
      let endPosition = new vscode.Position(0, text.length);
      let range = new vscode.Range(startPosition, endPosition);

      editBuilder.delete(range);
    });

    outgoing = undefined;
  });

  it("builds a normal kite event", function () {
    var outgoingInContext = outgoing;
    insertSomeText("test text").then(function (applied) {
      assert.ok(applied);
      let event = outgoingInContext.buildKiteEvent("test");

      assert.equal("vscode", event["source"]);
      assert.equal("test", event["action"]);
      assert.equal("test text", event["text"]);
    });
  });

  it("builds an edit too large kite event", function () {
    let text = new Array(Math.pow(2, 20) + 2).join("a");
    stubs.push(sinon.stub(vscode.window.activeTextEditor.document, "getText", function () {
      return text;
    }));

    let event = outgoing.buildKiteEvent("test");

    assert.equal("file_too_large", event["text"]);
    assert.equal("skip", event["action"]);
  });

  it("writes to the socket when sending an event", function () {
    var outgoingInContext = outgoing;
    insertSomeText("test text").then(function (applied) {
      let socketSpy = sinon.spy(outgoingInContext.outgoingSocket, "send");
      spies.push(socketSpy);

      outgoingInContext.sendEvent("test");
      assert.equal(true, socketSpy.calledOnce);
    });
  });

  it("writes to the socket when sending an error", function () {
    var outgoingInContext = outgoing;
    insertSomeText("test text").then(function (applied) {
      let socketSpy = sinon.spy(outgoingInContext.outgoingSocket, "send");
      spies.push(socketSpy);

      outgoingInContext.sendError("test");
      assert.equal(true, socketSpy.calledOnce);
    });
  });

  it("fires an edit event", function () {
    let eventSpy = sinon.spy(outgoing, "sendEvent");
    spies.push(eventSpy);

    outgoing.onEdit(undefined);
    assert.equal(true, eventSpy.calledWith("edit"));
  });

  it("fires a selection event", function () {
    let eventSpy = sinon.spy(outgoing, "sendEvent");
    spies.push(eventSpy);

    outgoing.onSelection(undefined);
    assert.equal(true, eventSpy.calledWith("selection"));
  });

  it("fires a focus event", function () {
    let eventSpy = sinon.spy(outgoing, "sendEvent");
    spies.push(eventSpy);

    outgoing.onEditorChange(undefined);
    assert.equal(true, eventSpy.calledWith("focus"));
  });
});

describe("Kite Incoming Tests", function () {
  let incoming = undefined;
  let stubs = [];
  let spies = [];

  beforeEach(function () {
    incoming = new Kite.KiteIncoming();
  });

  afterEach(function () {
    // Restores any stubs created in the tests.
    for (var i = 0; i < stubs.length; i++) {
      stubs[i].restore();
    }

    // Restores any spies created in the tests.
    for (var i = 0; i < spies.length; i++) {
      spies[i].restore();
    }

    incoming = undefined;
  });

  it("handles apply suggestions", function () {
    let applySpy = sinon.spy(incoming, 'handleApply');
    spies.push(applySpy);

    incoming.handleSuggestion({'type': 'apply'});
    assert.equal(true, applySpy.calledOnce);
  });

  it("handles highlight suggestions", function () {
    let highlightSpy = sinon.spy(incoming, 'handleHighlight');
    spies.push(highlightSpy);

    incoming.handleSuggestion({'type': 'highlight'});
    assert.equal(true, highlightSpy.calledOnce);
  });

  it("handles clear suggestions", function () {
    let clearSpy = sinon.spy(incoming, 'handleClear');
    spies.push(clearSpy);

    incoming.handleSuggestion({'type': 'clear'});
    assert.equal(true, clearSpy.calledOnce);
  });
});

describe('Kite Event Controller tests', function () {
  let controller = undefined;
  let stubs = [];
  let spies = [];

  beforeEach(function () {
    controller = new Kite.KiteEventController(
      new Kite.KiteIncoming(),
      new Kite.KiteOutgoing()
    );
  });

  afterEach(function () {
    // Restores any stubs created in the tests.
    for (var i = 0; i < stubs.length; i++) {
      stubs[i].restore();
    }

    // Restores any spies created in the tests.
    for (var i = 0; i < spies.length; i++) {
      spies[i].restore();
    }

    controller = undefined;
  });

  it("handles selection events", function () {
    let selectionSpy = sinon.spy(controller._outgoing, 'onSelection');
    spies.push(selectionSpy);

    controller.onSelection(undefined);
    assert.equal(true, selectionSpy.calledOnce);
  });

  it("handles edit events", function () {
    let editSpy = sinon.spy(controller._outgoing, 'onEdit');
    spies.push(editSpy);

    controller.onEdit(undefined);
    assert.equal(true, editSpy.calledOnce);
  });

  it("handles editor change events", function () {
    let editorChangeSpy = sinon.spy(controller._outgoing, 'onEditorChange');
    spies.push(editorChangeSpy);

    controller.onEditorChange(undefined);
    assert.equal(true, editorChangeSpy.calledOnce);
  });
});
