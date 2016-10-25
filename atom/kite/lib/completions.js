var http = require('http');
var utils = require('./utils.js');

// called to handle attribute completions
function getSuggestions(params) {
  if (!atom.config.get('kite.enableCompletions', false)) {
    return [];
  }
  return new Promise(function (resolve, reject) {
    var text = params.editor.getText();
    var cursor = utils.pointToOffset(text, params.bufferPosition);
    var payload = {
      "filename": params.editor.getPath(),
      "text": text,
      "cursor": cursor,
    };

    // don't send content over 1mb
    if (payload.text.length > (1 << 20)) {
      console.log("buffer contents too large, not attempting completions");
      reject();
      return;
    }

    var callback = function(response) {
      var str = '';
      response.on('data', function (chunk) {
        str += chunk;
      });

      response.on('end', function () {
        if (response.statusCode == 404) {
          // This means we had no completions for this cursor position. Do not call
          // reject() because that will generate an error in the console.
          resolve([]);
          return;
        } else if (response.statusCode != 200) {
          reject("error from kited: " + str);
          return;
        }

        try {
          var resp = JSON.parse(str);
        } catch (ex) {
          reject("error parsing response from kited: " + ex);
          return;
        }

        try {
          var suggestions = [];
          for (var i = 0; i < resp.completions.length; i++) {
            var c = resp.completions[i];
            suggestions.push({
              text: c.display,
              type: c.hint,
              rightLabel: c.hint,
            });
          }
          resolve(suggestions);
        } catch (ex) {
          reject("error processing completions from kited: " + ex);
          return;
        }
      });
    };

    var options = {
      host: '127.0.0.1',
      port: '46624',
      path: '/clientapi/editor/completions',
      method: 'POST',
    };

    var req = http.request(options, callback);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

module.exports = {
  selector: '.source.python',
  disableForSelector: '.source.python .comment, .source.python .string',
  inclusionPriority: 2,
  suggestionPriority: 2,
  excludeLowerPriority: false,
  getSuggestions: getSuggestions,
};
