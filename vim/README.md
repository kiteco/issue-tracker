# Vim/Neovim plugin for Kite


### Features

- [Integrates with Kite Copilot (macOS)](#kite-copilot)
- [Completions](#completions)
- [Documentation](#documentation)
- [Statusline](#statusline)


### Installation

Requires Vim 8 or NeoVim.

Download Kite from https://kite.com.  During Kite's installation process, select Vim and/or Neovim in the list of editors and Kite will install this plugin for you.

Kite will also keep the plugin up to date automatically.

[Learn more about Kite for Vim.](https://www.kite.com/integrations/vim)


### Kite Copilot

As you edit your code in Vim/Neovim, the Kite Copilot will show completions, examples, and docs for the code under the cursor.


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

Press `K` when the cursor is on a keyword to view its documentation in Kite Copilot.

If you have mapped `K` already, the plugin won't overwrite your mapping.

You can set an alternative mapping, e.g. to `gK`, like this:

```viml
nmap <silent> <buffer> gK <Plug>(kite-docs)
```

By default you need to type `K` (or whatever you have mapped to `<Plug>(kite-docs)`) each time you want to see documentation for the keyword under the cursor.  To have the documentation continually update itself as you move from keyword to keyword:

```viml
let g:kite_documentation_continual=1
```


### Commands

- `KiteDocsAtCursor` - show documentation for the keyword under the cursor.
- `KiteOpenCopilot` - open the Kite Copilot and focus on it.
- `KiteGeneralSettings` - open Kite's settings in the Copilot.
- `KitePermissions` - open Kite's permission settings in the Copilot.
- `KiteHelp` - show overview documentation.
- `KiteEnableAutoStart` - start Kite automatically when Vim starts.
- `KiteDisableAutoStart` - do not start Kite automatically when Vim starts.



### Statusline

Add `%{kite#statusline()}` to your statusline to get an indicator of what Kite is doing.  If you don't have a status line, this one matches the default when `&ruler` is set:

```viml
set statusline=%<%f\ %h%m%r%{kite#statusline()}%=%-14.(%l,%c%V%)\ %P
set laststatus=2  " always display the status line
```


### Debugging

Use `let g:kite_log=1` to switch on logging.  Logs are written to `kite-vim.log` in Vim's current working directory.


---

#### About Kite

Kite is built by a team in San Francisco devoted to making programming easier and more enjoyable for all. Follow Kite on
[Twitter](https://twitter.com/kitehq) and get the latest news and programming tips on the
[Kite Blog](https://kite.com/blog).
Kite has been featured in [Wired](https://www.wired.com/2016/04/kites-coding-asssitant-spots-errors-finds-better-open-source/), 
[VentureBeat](https://venturebeat.com/2019/01/28/kite-raises-17-million-for-its-ai-powered-developer-environment/), 
[The Next Web](https://thenextweb.com/dd/2016/04/14/kite-plugin/), and 
[TechCrunch](https://techcrunch.com/2019/01/28/kite-raises-17m-for-its-ai-driven-code-completion-tool/). 
