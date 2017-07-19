# Vim plugin for Kite

### Installation

Download Kite from https://kite.com/. During the installation process, select
"Vim" in the list of editors and Kite will install this plugin for you.

### Manual Installation

Copy `kite.vim` to `~/.vim/plugin/kite.vim` and restart vim.

### Debugging pointers

Change the source to set the `VERBOSE` constant to `True` and then logs will
be written to `~/.kite/logs/vim-plugin.log.`.

### Relationship to `kiteco/plugins`

Note that this repository is copy of the `vim-kite` directory of the
`kiteco/plugins` repository. This code will be removed from that repository
once the submodule references in the main kiteco repository are updated.
