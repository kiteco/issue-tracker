import sys
import unittest

if sys.version_info[0] >= 3:
	from unittest.mock import patch, Mock, MagicMock
else:
	from mock import patch, Mock, MagicMock

if sys.version_info[0] >= 3:
	SUBLIME_VERSION = 3
else:
	SUBLIME_VERSION = 2


class View(object):
	"""No need to mock this one because it is simpler just to do explicitly."""
	def __init__(self, contents):
		self.contents = contents

	def substr(self, region):
		return self.contents[region.begin:region.end]


class Region(object):
	"""No need to mock this one because it is simpler just to do explicitly."""
	def __init__(self, begin, end):
		self.begin = begin
		self.end = end


class Selection(object):
	"""No need to mock this one because it is simpler just to do explicitly."""
	def __init__(self, a, b):
		self.a = a
		self.b = b


class EventListener(object):
  	"""do not mock this or else SublimeKite will also end up as a mock"""
  	pass


def make_view(contents, cursor, selection_to=None, path="/src/code.py", index=(0, 0)):
	"""Creates a mock for a sublime view"""
	if selection_to is None:
		selection_to = cursor

	window = Mock(name="window")
	window.get_view_index = Mock(return_value=index)

	view = Mock(name="view")
	view.substr = Mock(return_value=contents)
	view.file_name = Mock(return_value=path)
	view.window = Mock(return_value=window)
	view.sel = Mock(return_value=[Selection(cursor, selection_to)])
	view.size = Mock(return_value=len(contents))

	return view


class TestCase(unittest.TestCase):
	def setUp(self):
		# for testing assume that python2 implies sublime2, python3 implies sublime3
		self.sublime = Mock()
		self.sublime.Region = Region
		self.sublime.version = Mock(return_value=str(SUBLIME_VERSION))

		self.sublime_plugin = Mock()
		self.sublime_plugin.EventListener = EventListener

	def test_selection_event(self):
		contents = "buffer contents"

		# make sure "sublime" and "sublime_plugin" are importable
		with patch.dict("sys.modules", sublime=self.sublime, sublime_plugin=self.sublime_plugin):
			# now that the package-level mocks are registered we can import SublimeKite
			import SublimeKite

			# avoid starting the real event loop 
			with patch.object(SublimeKite.SublimeKite, "__init__", return_value=None):
				# avoid filesystem calls
				SublimeKite.realpath = lambda s: s

				# capture pushes to the event queue
				SublimeKite.SublimeKite._event_queue = Mock()

				# instantiate the plugin
				plugin = SublimeKite.SublimeKite()

				# call the on_modified callback with a mock view
				plugin.on_modified(make_view(contents, 3))

				# test that the right event was generated
				expected = {
	                'source': "sublime%d" % SUBLIME_VERSION,
	                'action': "edit",
	                'filename': "/src/code.py",
	                'selections': [{"start": 3, "end": 3}],
	                'text': contents,
	                'pluginId': '',
				}

				SublimeKite.SublimeKite._event_queue.put.assert_called_once_with(
					expected,
					block=False)
