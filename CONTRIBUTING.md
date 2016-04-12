## Contributing to Kite plugins

First of all, thank you for contributing to Kite plugins! We're glad that you're joining us to bring Kite live to more editors and help more programmers code better and faster! 

You can participate in many ways including, but not limited, to:
- File an issue for existing plugins
- Make pull requests to fix bugs
- Create a plugin for an unsupported editor.


## File an issue
- Use descriptive titles. 
- Describe the problem as specific as possible. 
- Add a screenshot or create a gif to record the problem of the plugin. You can use tools like [this](https://itunes.apple.com/us/app/gifgrabber/id668208984?mt=12) to make a gif.
- Label the issue with the editor name.
- As always, before you file an issue, check whether someone has already reported the same bug to avoid redundancy.


## Make pull requests (pr) for fixing bugs
- Describe what's fixed in the pr clearly. Add a gif to show the before/after pr effect. 
- Follow the style guideline of the chosen language for the plugin.
- If the pr is for fixing an existing issue, cite the issue number in the pull request.


## Create a plugin for an unsupported editor
- Follow the style guideline of the chosen language for the implementation. 
- Test rigoriously. Test whether your plugin can successfully write to an UNIX domain socket, and whether it can reads from one. We strongly encourage you to include unit tests in your pr.
- Share your plugin with the world! Note that all the source code in this repo is released under the MIT license. If the plugin is carefully tested, we will include it in Kite, so that programmers around the world can use the awesome tool you've built for them!
