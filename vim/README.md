# Vim/Neovim plugin for Kite


### Features

- [Integrates with Kite Sidebar (macOS)](#kite-sidebar)
- [Completions](#completions)
- [Documentation](#documentation)
- [Statusline](#statusline)


### Installation

Requires Vim 8 or NeoVim.

Download Kite from https://kite.com.  During Kite's installation process, select Vim and/or Neovim in the list of editors and Kite will install this plugin for you.

Kite will also keep the plugin up to date automatically.


### Manual installation

#### Vim

Assuming your Vim configuration is in `~/.vim/`:

```sh
$ mkdir -p ~/.vim/pack/kite/start/kite
$ git clone https://github.com/kiteco/vim-plugin.git ~/.vim/pack/kite/start/kite/
```

Restart Vim.


#### Neovim

Assuming your Neovim configuration is in `~/.config/nvim`:

```sh
$ mkdir -p ~/.config/nvim/pack/kite/start/kite
$ git clone https://github.com/kiteco/vim-plugin.git ~/.config/nvim/pack/kite/start/kite/
```

Restart Neovim.


### Kite Sidebar

As you edit your code in Vim/Neovim, the Kite Sidebar will show completions, popular patterns, code examples, and documentation for the code under the cursor.


### Completions

Kite's ranked completions are integrated with Vim's insert-mode completion, specifically the user-defined completion.  Kite shows normal completions or signature-completions as appropriate for the cursor position.

By default Kite's completions will show up automatically as you type.  You can opt out via:

```viml
let g:kite_auto_complete=0
```

You can manually invoke the completions in insert mode with `<C-X><C-U>`.  See `:h i_CTRL-X_CTRL-U` for details.

Normally you insert the currently selected completion option with `<C-y>`.  If you'd like to use `<Tab>` instead / as well, add this to your vimrc:

```viml
let g:kite_tab_complete=1
```

You can configure how the completions behave with `&completeopt`.  The plugin configures `&completeopt` as follows if and only if you haven't configured it yourself:

```viml
set completeopt-=menu
set completeopt+=menuone   " show the popup menu even when there is only 1 match
set completeopt-=longest   " don't insert the longest common text
set completeopt-=preview   " don't show preview window
set completeopt+=noinsert  " don't insert any text until user chooses a match
set completeopt-=noselect  " select first match
```

Make sure you have either `menu` or `menuone` otherwise you won't see any completions.

If you set `longest` together with `menu` or `menuone`, you will need to type `CTRL-L` when the pop-up menu is showing to insert the longest common text.  See `:help completeopt` for details.

To see documentation in the preview window for each completion option, copy all the lines above into your vimrc and change the preview line to:

```viml
set completeopt+=preview
```

To have the preview window automatically closed once a completion has been inserted:

```viml
autocmd CompleteDone * if !pumvisible() | pclose | endif
```

We also recommend:

```viml
set belloff+=ctrlg  " if vim beeps during completion
```


### Documentation

Press `K` when the cursor is on a keyword to open a split window with code snippets, links to relevant StackOverflow answers, all the places you've use the keyword in your code, and links to fuller online documentation.  Press `<CR>` on any item to see more information.

If you have mapped `K` already, the plugin won't overwrite your mapping.

You can set an alternative mapping, e.g. to `gK`, like this:

```viml
nmap <silent> <buffer> gK <Plug>(kite-hover)
```

By default you need to type `K` (or whatever you have mapped to `<Plug>(kite-hover)`) each time you want to see documentation for the keyword under the cursor.  To have the documentation continually update itself as you move from keyword to keyword:

```viml
let g:kite_documentation_continual=1
```

When you press `<CR>` on a usage or definition, it will be shown in the code window you came from.  To see it in the preview window instead:

```viml
let g:kite_preview_code=1
```

The plugin displays the sign column in the documentation window and, by default, sets it to use the same highlight as the line number column.  If you would prefer the plugin not to alter the `SignColumn` highlight:

```viml
let g:kite_override_sign_column_highlight=0
```


### Statusline

Add `%{kite#statusline()}` to your statusline to get an indicator of what Kite is doing.  If you don't have a status line, this one matches the default when `&ruler` is set:

```viml
set statusline=%<%f\ %h%m%r%{kite#statusline()}%=%-14.(%l,%c%V%)\ %P
set laststatus=2  " always display the status line
```


### Editor metrics

When you start Vim after installing Kite, it will ask whether you wish to opt in to sending metrics about the status of the Kite application to Kite's servers.

You can also opt in or out at any time with the following commands:

```viml
" Opt in
:KiteEnableEditorMetrics

" Opt out
:KiteDisableEditorMetrics
```


### Development

When working on the plugin, ensure the file `~/.kite/vim-development` (or `$LOCALAPPDATA$\Kite\vim-development` on Windows) is present.  This tells the plugin to use development mode, i.e. to use the non-production key when POSTing metrics to Segment.


### Debugging

Use `let g:kite_log=1` to switch on logging.  Logs are written to `kite-vim.log` in Vim's current working directory.
