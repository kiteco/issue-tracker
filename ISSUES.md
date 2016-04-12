### Known issues
`PyCharm`
* Inbound events may top out at 4 or 10MB's in size.

vim
* No "focus" events.
* Diff suggestions (highlight, apply) may not work if the relevant file isn't the file in focus.

`Sublime Text`
* Same file open multiple times, with different contents in each, may cause issues.
* Diff suggestions (highlight, apply) may not work if the relevant file isn't the file in focus.

`Atom`
* Diff suggestions (highlight, apply) may not work if the relevant file isn't the file in focus.

`All`
* .py files with unicode characters (e.g. in string literals) won't work, in particular passive search for locations after such literals.
* Kite fails if UDP port 46625 isn't available for Kite to listen on. One common way this could happen: if multiple "Users" on the machine are running Kite.
* `error` actions should probably have their own json structure, since they don't include suggestions, and thus should put the error contents in a field instead of in `text` with an extra layer of json encoding.
