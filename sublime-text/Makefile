#! /usr/bin/make

ROOT_DIR := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
PLUGIN_DIR_2 := ~/Library/Application\ Support/Sublime\ Text\ 2/Packages/SublimeKite/
PLUGIN_DIR_3 := ~/Library/Application\ Support/Sublime\ Text\ 3/Packages/SublimeKite/

install2:
	mkdir -p $(PLUGIN_DIR_2)
	ln -sf $(ROOT_DIR)/SublimeKite.py $(PLUGIN_DIR_2)/SublimeKite.py

install3:
	mkdir -p $(PLUGIN_DIR_3)
	ln -sf $(ROOT_DIR)/SublimeKite.py $(PLUGIN_DIR_3)/SublimeKite.py
