This is the top-level container for the Kite ST3 plugin.

`Kite` contains the ST3 package itself, while `st_packge_builder` is a submodule of the package builder repo from https://github.com/kiteco/st_package_builder. Read their respective READMEs for more information.

This directory also contains scripts used for building and releasing the plugin.

## Requirements for the build script

- Python 3.3.6 (use `pyenv` and `pyenv-virtualenv` to install and create a virtualenv with 3.3.6)
- (MacOS) `coreutils` from `brew`
- `golang` with `go-bindata`
