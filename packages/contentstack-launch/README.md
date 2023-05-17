Launch CLI plugin
=================

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)

With Launch CLI, you can interact with the Contentstack Launch platform using the terminal to create, manage and deploy Launch projects.

<!-- toc -->
* [Usage](#usage)
* [Installation steps](#installation-steps)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli-launch
$ csdx COMMAND
running command...
$ csdx (--version|-v)
@contentstack/cli-launch/1.0.0 darwin-arm64 node-v16.19.1
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->
# Installation steps
```sh-session
GitHub installation steps:
$ git clone clone <repo url>
$ npm install
$ npm run build
$ csdx plugins:link <plugin path>

NPM installation steps:
$ csdx plugins:install @contentstack/launch-cli
$ csdx launch
```

# Commands
```sh-session
$ csdx launch
start with launch flow <GitHub|FileUpload>
$ csdx launch:logs
To see server logs
$ csdx launch:logs --type d
To see deployment logs
$ csdx launch:functions
Run cloud functions locally
```
<!-- commandsstop -->
