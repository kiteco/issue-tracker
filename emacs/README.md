# Emacs plugin for Kite

### Installation

Download Kite from http://kite.com/. During the installation process, select
"Emacs" in the list of editors and Kite will install this plugin for you.

### Manual Installation

Copy `kite.el` to `~/.emacs.d/kite.el` and add the following to your `.emacs`:

```
(load-file "~/.emacs.d/kite.el")
```

### Debugging pointers

Use `M-x load-file` to load and execute a `.el` file in emacs.

To see log output from the plugin, switch to the `*Messages*` buffer.
