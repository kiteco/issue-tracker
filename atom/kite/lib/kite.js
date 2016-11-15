// Contents of this plugin will be reset by Kite on start. Changes you make
// are not guaranteed to persist.
const events = require('./events.js');
const completions = require('./completions.js');
const ready = require('./ready.js');
const metrics = require('./metrics.js');

module.exports = {
  activate: function() {
    metrics.track("activated");

    // observeTextEditors takes a callback that fires whenever a new
    // editor window is created. We use this to call "observeEditor",
    // which registers edit/selection based callbacks.
    atom.workspace.observeTextEditors(events.observeEditor);

    // focus is tracked at the workspace level.
    atom.workspace.onDidChangeActivePaneItem(events.onFocus);

    ready.ensure();
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
