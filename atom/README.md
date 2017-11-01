## Atom Kite Plugin Documentation

### Supported Atom Versions

All Atom versions greater than or equal to `v1.13.0` are supported.

### Supported Operating Systems

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

![kite tour](./docs/images/kite-tour.png)

This tour will only be displayed once. If you want to see it again on next startup you can activate the `Show Kite Tour On Startup` setting.

### Status Bar

The Kite icon in the status bar displays the state of Kite for the current file. Clicking on the icon will open the status panel with additional information.

The icon in the status bar can take three different colors:

- blue: The Kite Engine is available and functioning properly.<br/>![kite tour](./docs/images/kite-status-ready.png)
- gray: There's either no open file or, if there's an active file, the file is either not supported or not whitelisted.<br/>![kite tour](./docs/images/kite-status-not-whitelisted.png)
- red: Something went wrong when the plugin tried to contact the Kite service on your computer. Depending on the issue, the status panel can offer actions to solve the problem.<br/>![kite tour](./docs/images/kite-status-not-running.png)

### Editor Features

#### Hover documentation

When you move the mouse over a symbol, Kite can display a popup with a quick summary of what this symbol represents and links to additional documentation.

![kite hover](./docs/images/kite-hover.png)

You can see up to three links in the popup:

- `def` will open the file where this symbol is defined (this may not be available if Kite cannot find the definition)
- `web` will open the symbol documentation page in your browser
- `more` will open the [Kite sidebar panel](#sidebar-panel) with additional documentation for this symbol

#### Context Menu

Kite also provides contextual menus with actions related to the symbol below the mouse.

![kite sidebar](./docs/images/kite-context-menu.png)

#### Completions

Kite exposes an `autocomplete-plus` provider. When in a supported file, you'll be able to see Kite's suggestions as well as some additional documentation and links in the `autocomplete-plus` panel.

![kite completions](./docs/images/kite-completions.png)

The links at the bottom have the same behaviour of those in the [hover UI](#hover-documentation).

#### Functions Signatures

When typing inside a function's parentheses Kite will display the function signature with information regarding the current argument and links to additional documentation.

![kite signatures](./docs/images/kite-signature.png)

The links at the bottom have the same behaviour of those in the [hover UI](#hover-documentation).

#### Sidebar Panel

The Kite sidebar panel offers a more detailed view of a symbol's documentation. You can use the sidebar panel to browse the members of a module or a type, or to access curated examples, StackOverflow topics, and more.

![kite sidebar](./docs/images/kite-sidebar.png)

#### Active Search

When working in a supported file, this small overlay will be displayed at the bottom right of the workspace.

![kite sidebar](./docs/images/kite-active-search-collapsed.png)

Clicking on it will expand Kite's active search panel. It allows you to search for identifiers from 3rd party packages or your local codebase.

![kite sidebar](./docs/images/kite-active-search.png)

### Commands

Kite exposes many commands so that you can setup your own keybindings for them.

|Command|Description|
|---|---|
|`kite:active-search`|Expand the active search panel.|
|`kite:expand-at-cursor`|When the cursor is inside a symbol this command will open the sidebar panel with the symbol's documentation.|
|`kite:open-permissions`|Opens Kite's permissions into your browser.|
|`kite:open-settings`|Opens Kite's settings into your browser.|
|`kite:open-sidebar`|Opens Kite's sidebar panel.|
|`kite:close-sidebar`|Closes Kite's sidebar panel.|
|`kite:toggle-sidebar`|Toggle Kite's sidebar panel. This will close the panel if it was open, or vice versa.|

### Settings


|Setting|Description|
|---|---|
|`Show Kite Tour On Startup`|Whether or not to display the Kite tour on startup.|
|`Enable Completions`|Show auto-completions from Kite as you code.|
|`Enable Hover UI`|Show hover  when placing the mouse over a symbol|
|`Display Expand View As`|This setting defines how the Kite expanded view will be displayed in Atom.|
|`Sidebar Position`|When `Display Expand View As` is set to `sidebar` this setting defines where to place the sidebar in the Atom UI.|
|`Sidebar Width`|When `Display Expand View As` is set to `sidebar` this setting defines the width of the sidebar.|
|`Use Dock For Sidebar`|If the dock API is available in your Atom version Kite will use it to display the sidebar panel.|
|`Open Sidebar On Startup`|When `Display Expand View As` is set to `sidebar` this setting will make the sidebar appear on startup.|
|`Max Visible Suggestions Along Signature`|This setting controls the maximum number of completions shown when a function signature is also show|
|`Active Search Position`|Controls where the active search collapsed panel is displayed.|
|`Hide Documentation When Signature Is Available`|This settings controls whether or not documentation is also shown when a function signature is shown|
|`Collapse Long Summaries`|Whether or not to collapse or not long summaries in the sidebar panel.|
|`Polling Interval`|The interval between status checks for the active file.|
|`Logging Level`|The verbosity level of Kite's logs.|
|`Developer Mode`|Enable Kite developer mode, displaying received data in the various UIs.|
