# Kite Python Plugin for Sublime Text 3

Kite is an AI-powered programming assistant that helps you write Python code inside Sublime Text 3. Kite helps you write code faster by showing you the right information at the right time. Learn more about how Kite saves you time and effort in Sublime Text at https://kite.com/integrations/sublime-text/.

At a high level, Kite provides you with:
* 🧠 __[Line-of-Code Completions](https://kite.com/blog/product/launching-line-of-code-completions-going-cloudless-and-17-million-in-funding/)__ powered by machine learning models trained on the entire open source code universe
* 📝 __[Intelligent Snippets](https://kite.com/blog/product/announcing-intelligent-snippets-for-python/)__ that automatically provide context-relevant code snippets for your function calls
* 🔍 __[Instant documentation](https://kite.com/copilot/)__ for the symbol underneath your cursor so you save time searching for Python docs


## Requirements

* macOS 10.10+ or Windows 7+ or Linux (Ubuntu, Debian, Fedora, Arch Linux, Linux Mint, openSUSE, KDE, XFCE, Gnome 2, 
Gnome 3)
* Sublime Text build 3000+
* [Kite Engine](https://kite.com/)

Use another editor? Check out [Kite’s other editor integrations](https://kite.com/integrations/).


## Installation

### Installing the Kite Engine

The [Kite Engine](https://kite.com/) needs to be installed in order for the package to work properly. The package itself provides the frontend that interfaces with the Kite Engine, which performs all the code analysis and machine learning 100% locally on your computer (no code is sent to a cloud server).

__macOS Instructions__
1. Download the [installer](https://kite.com/download/) and open the downloaded `.dmg` file.
2. Drag the Kite icon into the `Applications` folder.
3. Run `Kite.app` to start the Kite Engine.

__Windows Instructions__
1. Download the [installer](https://kite.com/download/) and run the downloaded `.exe` file.
2. The installer should run the Kite Engine automatically after installation is complete.

__Linux Instructions__
1. Visit https://kite.com/linux/ to install Kite.
2. The installer should run the Kite Engine automatically after installation is complete.

### Installing the Kite Plugin for Sublime

When running the Kite Engine for the first time, you'll be guided through a setup process which will allow you to install
the Sublime package. You can also install or uninstall the Sublime package at any time using the Kite Engine's [plugin
manager](https://help.kite.com/article/62-managing-editor-plugins).

Alternatively, you can `git clone` this repository directly into your Sublime `Packages` directory. You can locate your
`Packages` directory by opening Sublime, clicking on the `Preferences` menu item, then selecting `Browse Packages...`.

[Learn more about why Kite's autocomplete and docs search experience is the best available for Sublime.](https://kite.com/integrations/sublime-text/)


## Usage

The following is a brief guide to using Kite in its default configuration.

### Hover

Hover your mouse cursor over a symbol to view a short summary of what the symbol represents.

![hover](https://github.com/kiteco/KiteSublime/blob/master/docs/assets/hover.png?raw=true)

If the built-in `show_definition` preference is enabled, Kite will show you the definitions and references found in the 
Sublime index as usual.

![hover-show-definition](https://github.com/kiteco/KiteSublime/blob/master/docs/assets/hover-show-definition.png?raw=true)

### Documentation

Click on the `Docs` link in the hover popup to open the documentation for the symbol inside the [Copilot](https://kite.com/copilot/), Kite's desktop app for Python documentation. The Copilot's search results also follow your cursor as you type.

![copilot](https://github.com/kiteco/KiteSublime/blob/master/docs/assets/copilot.png?raw=true)

### Definitions

If a `Def` link is available in the hover popup, clicking on it will jump to the definition of the symbol.

### Autocompletions

Simply start typing in a saved Python file and Kite will automatically suggest completions for what you're typing.

![completions](https://github.com/kiteco/KiteSublime/blob/master/docs/assets/completions.png?raw=true)

### Function Signatures

When you call a function, Kite will show you the arguments required to call it.

![signatures](https://github.com/kiteco/KiteSublime/blob/master/docs/assets/signatures.png?raw=true)

Kite also shows you `How others used this` function, which are the most popular calling patterns inferred from all the
open source code on the internet.

### Commands and Keyboard Shortcuts

In case you prefer to not use the mouse, most of Kite's features can be triggered from the command palette.

![commands](https://github.com/kiteco/KiteSublime/blob/master/docs/assets/commands.png?raw=true)

Furthermore, Kite comes with the following default keyboard shortcuts:

|Command|Shortcut|Description|
|:---|:---|:---|
|`H`over|`ctrl`+`alt`+`h`|Show the hover popup at your current cursor position|
|`D`ocumentation|`ctrl`+`alt`+`d`|Show documentation in the Copilot|
|F`u`nction Signatures|`ctrl`+`alt`+`u`|Show the function signature panel|
|Ke`y`word Arguments|`ctrl`+`alt`+`y`|Show/hide keyword arguments (when function signature panel is shown)|
|`P`opular Patterns|`ctrl`+`alt`+`p`|Show/hide popular calling patterns (when function signature panel is shown)|

## Configuration

You can change Kite's settings by clicking on `Preferences`, then `Package Settings`, then `Kite`. Alternatively, you can 
access the preferences files from the command palette using `Kite: Package Settings`. The default preferences file should
be self documenting.

## Known Issues

* On Sublime 3200+, the function signature UI is truncated in some situations. ([Issue]( https://github.com/SublimeTextIssues/Core/issues/2711))

## Contact Us

Feel free to contact us with bug reports, feature requests, or general comments at feedback@kite.com.

Happy coding!


---

#### About Kite

Kite is built by a team in San Francisco devoted to making programming easier and more enjoyable for all. Follow Kite on
[Twitter](https://twitter.com/kitehq) and get the latest news and programming tips on the
[Kite Blog](https://kite.com/blog/).
Kite has been featured in [Wired](https://www.wired.com/2016/04/kites-coding-asssitant-spots-errors-finds-better-open-source/), 
[VentureBeat](https://venturebeat.com/2019/01/28/kite-raises-17-million-for-its-ai-powered-developer-environment/), 
[The Next Web](https://thenextweb.com/dd/2016/04/14/kite-plugin/), and 
[TechCrunch](https://techcrunch.com/2019/01/28/kite-raises-17m-for-its-ai-driven-code-completion-tool/). 

