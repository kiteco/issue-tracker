# KiteCode

KiteCode is a plugin that integrates Kite, the programming assistant into Visual Studio code. Kite will automagically suggest library usages, point out syntactic errors, and will generally work with you to make (Python) development less painful.

## Installing the extension

1. [Download the extension package](https://github.com/bnookala/plugins/raw/master/kitecode/KiteCode-0.1.0.vsix).
2. Open Visual Studio Code
3. Open Kite
4. Drag the extension package onto Visual Studio Code **OR** Open the extension package using the File -> Open interface.
5. That's it!


## Installing for development

Run ```npm install``` in the base directory of this repositiory.

## Testing

Open Visual Studio Code, navigate to this project directory, and change the launch target from `Launch Extension` to `Launch Tests`. Then, hit the green play triangle. Testing from the command line to come as soon as I can figure it out.

## Support

Kite is Mac OS only, and this extension makes use of UNIX sockets, so this extension only works on Mac OS.