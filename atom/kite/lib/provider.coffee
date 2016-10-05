provider =
  #selector: '.source.js, .source.coffee, .source.python'
  selector: '*'

  getSuggestions: ({editor, bufferPosition}) ->
    console.log "hello from getSuggestions"
    prefix = @getPrefix(editor, bufferPosition)

    new Promise (resolve) ->
      suggestion =
        text: 'elephant'
        replacementPrefix: prefix
      resolve([suggestion])

  getPrefix: (editor, bufferPosition) ->
    console.log "hello from getPrefix"
    # Whatever your prefix regex might be
    regex = /[\w0-9_-]+$/

    # Get the text for the line up to the triggered buffer position
    line = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition])

    # Match the regex to the line, and return the match
    line.match(regex)?[0] or ''

console.log "hello from provider.coffee"


module.exports =
  provider: provider
