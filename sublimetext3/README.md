# Sublime Text 3 Kite Plugin Documentation

This is a brief documentation of Sublime Text 3 Kite Plugin

## Supported Sublime Text Versions

The plugin supports any Sublime Text build equal or higher than 3000, but some features require specific version. That
means that if your Sublime Text build is lower than the needed one for a given feature, that feature will remain
disabled. You can find a table of required versions by feature below.

### Table of required Sublime Text build by feature

In order to use all of any of the Kite features, your Sublime Text version must be equal or better than the ones
specified in this table.

| Feature | Minimum ST build |
| ---     |             ---: |
| Autocompletion | >= **3000** |
| Sidebar Sync | >= **3000** |
| Popups | >= **3070** |
| Hover | >= **3124** |
| Extended Panel (*deprecated*) | >= **3124** |
| Status Panel (*deprecated*) | >= **3124** |

## Supported Operating Systems

Kite’s Sublime Text 3 plugin officially supports all Operating Systems being already supported by Kite itself, currently:

* macOS (10.10 and higher)
* Windows (7 and higher)
* GNU/Linux (experimental builds)

## Supported Languages

Sublime Text 3 Kite plugin supports any language already supported by Kite engine:

* Python: All files that Sublime Text 3 highlights as Python code will be supported

# Installation

You can install the plugin in Kite Copilot settings.

# Startup

When starting Sublime Text 3 Kite plugin for the first time, the Kite’s tour will be displayed in the active view.

![kite tour](./docs/images/tour_screenshot.png)

This tour will be displayed once. If you want to see it again on next startup you can activate it setting the
`show_kite_tour_at_startup` option as `true` in `Kite.sublime-settings` in your User settings.

# Status Bar

Kite displays its current status (with a delay of one second max) in the Sublime Text 3 status bar.
![kite status bar](./docs/images/status_bar_screenshot.png)

# Working with Source Code

The Kite plugin modifies or enhances several features of your Sublime Text 3 editor. Those changes are only visible
while you edit files that are supported by Kite, and they are present in a directory that you whitelisted
and allowed Kite to index it's content to be analyzed.

## Code Completion

When Kite is installed and ready, and you are editing files in a whitelisted directory, Kite will inject
intelligent completion results into your regular Sublime Text 3 completion dialog.
Kite completion items can be told apart by their kind being shown in the right-hand side.

![kite autocompletion](./docs/images/autocompletion_screenshot.png)

## Mouse Hover Info

While navigating code, Kite will detect when the mouse if hovering over an expression. If there is information that can be
retrieved and displayed, Kite will present the popup shown below.

![kite hover](./docs/images/hover_screenshot.png)

Clicking the `web` link will open your default web browser pointing to Kite website with additional
and complete information about the expression. Clicking the `more` link will show the sidebar described
in the next section.

## Sidebar

The sidebar will offer a much more detailed view of an expression documentation and properties. You can use the
sidebar to browse the members of a module or type, or to access curated examples, and more.
