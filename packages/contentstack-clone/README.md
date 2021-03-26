@contentstack/cli-cm-clone
==========================

It is Contentstack’s CLI plugin to clone a stack. Using this command, you can export a stack’s content/schema to a new or existing stack. Refer to the [Clone a Stack](https://www.contentstack.com/docs/developers/cli/clone-a-stack/) documentation to learn more.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@contentstack/cli-cm-clone.svg)](https://npmjs.org/package/@contentstack/cli-cm-clone)
[![Downloads/week](https://img.shields.io/npm/dw/@contentstack/cli-cm-clone.svg)](https://npmjs.org/package/@contentstack/cli-cm-clone)
[![License](https://img.shields.io/npm/l/@contentstack/cli-cm-clone.svg)](https://github.com/rohitmishra209/cli-cm-clone/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli-cm-clone
$ csdx COMMAND
running command...
$ csdx (-v|--version|version)
@contentstack/cli-cm-clone/0.1.0-beta-1 darwin-x64 node-v13.14.0
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->
```sh-session
$ npm install -g @contentstack/cli-cm-clone
$ csdx COMMAND
running command...
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
# Commands
<!-- commands -->
* [`csdx cm:stack-clone`](#csdx-cmstack-clone)

## `csdx cm:stack-clone`

This command allows you to migrate data (structure or content or both) from one stack to another stack (either new or existing)

```
USAGE
  $ csdx cm:stack-clone

DESCRIPTION
  ...
  Use this plugin to automate the process of cloning a stack in a few steps.

EXAMPLE
  csdx cm:stack-clone
```

_See code: [src/commands/cm/stack-clone.js](https://github.com/contentstack/cli/blob/v0.1.0-beta-1/src/commands/cm/stack-clone.js)_
<!-- commandsstop -->
