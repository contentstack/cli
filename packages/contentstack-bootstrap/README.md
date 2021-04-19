## Description
This plugin allows you to bootstrap contentstack apps with a single command.


@contentstack/cli-cm-bootstrap
===================

It is Contentstack’s CLI plugin bootstrap contentstack apps with a single command.

[![License](https://img.shields.io/npm/l/@contentstack/cli)](https://github.com/contentstack/cli/blob/main/LICENSE)

# Usage
<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli-cm-bootstrap
$ csdx COMMAND
running command...
$ csdx (-v|--version|version)
@contentstack/cli-cm-export/0.1.1-beta.3 darwin-x64 node-v13.14.0
$ csdx --help [COMMAND]
USAGE
  $ csdx cm:bootstrap
...
```

### Steps
* Bootstrap command would list the sample apps available
* Clone the selected sample app to the given location (folder path)
* Asks the user create/select an existing stack.
* Import the sample app contents to the stack.
* App is ready to use!

