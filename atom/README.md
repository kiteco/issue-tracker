## Atom Kite Plugin Documentation

### Supported Atom versions

All Atom versions greater than or equal to `v1.13.0` are supported.

### Supported operating systems

All OS's supported by Kite are also supported by the Atom plugin, currently it supports:
- OSX (10.10 and higher)
- Windows (7 and higher)

### Supported languages

The plugin's features are only available in file types supported by the Kite engine:

- Python: All files with a `.py` extension are supported.

### Install

You can install the Atom plugin from Kite directly. You can also install the plugin by searching for "Kite" in the package manager or by running `apm install kite` in your terminal.

### Startup

When starting Atom with Kite plugin for the first time, a brief tour about Kite will be displayed in the active pane.

![kite tour](https://github.com/kiteco/atom-plugin/blob/master/docs/images/kite-tour.png?raw=true)

This tour will only be displayed once. If you want to see it again on next startup you can activate the `Show Kite Tour On Startup` setting.

### Status bar

The Kite icon in the status bar displays the state of Kite for the current file. Clicking on the icon will open the status panel with additional information.

The icon in the status bar can take three different colors:

- blue: The Kite Engine is available and functioning properly.<br/>![kite tour](https://github.com/kiteco/atom-plugin/blob/master/docs/images/kite-status-ready.png?raw=true)
- gray: There's either no open file or, if there's an active file, the file is either not supported or not whitelisted.<br/>![kite tour](https://github.com/kiteco/atom-plugin/blob/master/docs/images/kite-status-not-whitelisted.png?raw=true)
- red: Something went wrong when the plugin tried to contact the Kite service on your computer. Depending on the issue, the status panel can offer actions to solve the problem.<br/>![kite tour](https://github.com/kiteco/atom-plugin/blob/master/docs/images/kite-status-not-running.png?raw=true)

### Editor features

#### Hover info

When you move the mouse over an expression, Kite can display a popup with a quick summary of what this expression represents, and links to additional documentation.

![kite hover](https://github.com/kiteco/atom-plugin/blob/master/docs/images/kite-hover.png?raw=true)

You can see up to three links in the popup:

- `def` will open the file where this symbol is defined (this may not be available if Kite cannot find the definition)
- `web` will open the symbol documentation page in your browser
- `more` will open the Kite copilot with additional documentation for this symbol

#### Completions

Kite exposes an `autocomplete-plus` provider. When in a supported file, you'll be able to see Kite's suggestions as well as some additional documentation and links in the `autocomplete-plus` panel.

![kite completions](https://github.com/kiteco/atom-plugin/blob/master/docs/images/kite-completions.png?raw=true)

The links at the bottom have the same behaviour of those in the [hover UI](#hover-documentation).

#### Function signatures

When typing inside a function's parentheses, Kite will display the function signature with info about the current argument and links to additional documentation.

![kite signatures](https://github.com/kiteco/atom-plugin/blob/master/docs/images/kite-signature.png?raw=true)

The links at the bottom have the same behavior of those in the [hover popup](#hover-info).

Kite exposes many commands so that you can setup your own keybindings for them.

|Command|Description|
|---|---|
|`kite:docs-at-cursor`|When the cursor is inside an expression, this command will open the copilot with relevant docs.|
|`kite:open-copilot`|Open the Kite copilot.|
|`kite:permissions`|Opens Kite permissions into the copilot.|
|`kite:general-settings`|Opens Kite settings into the copilot.|
|`kite:editor-plugin-settings`|Opens the Kite plugin settings in Atom.|
|`kite:help`|Open Kite help into your browser.|
|`kite:status`|Open the Kite status panel.|
