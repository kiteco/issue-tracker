// Contents of this plugin will be reset by Kite on start. Changes you make
// are not guaranteed to persist.

var events = require('./events.js')
var completions = require('./completions.js');

module.exports = {
  activate: function() {
    // observeTextEditors takes a callback that fires whenever a new
    // editor window is created. We use this to call "observeEditor",
    // which registers edit/selection based callbacks.
    atom.workspace.observeTextEditors(events.observeEditor);

    // focus is tracked at the workspace level.
    atom.workspace.onDidChangeActivePaneItem(events.onFocus);
  },
  completions: function() {
    return completions;
  },
  config: {
    enableCompletions: {
      type: "boolean",
      default: false,
      title: "Enable Completions",
      description: "Show auto-completions from Kite as Atom suggestions",
    },
  },
};
