@contentstack/cli-plugins-plugin
=======

Contentstack allows developers to write plugins and add custom commands to the CLI to perform additional tasks using CLI.

[![License](https://img.shields.io/npm/l/@contentstack/cli)](https://github.com/contentstack/cli/blob/main/LICENSE)

* [Usage](#usage)
* [Commands](#commands)
# Usage
```sh-session
$ npm install -g @contentstack/cli-plugins-plugin
$ csdx COMMAND
running command...
$ csdx (-v|--version|version)
@contentstack/cli-plugins-plugin/0.0.0 linux-x64 node-v12.18.4
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
# Commands
* [`csdx plugins:create`](#csdx-pluginscreate)

### `csdx plugins:create`

Generate plugin starter code

```
USAGE
  $ csdx plugins:create
```

_See code: [src/commands/plugins/create.js](https://github.com/contentstack/cli/blob/v0.1.1-beta.1/packages/contentstack-plugins/src/commands/plugins/create.js)_
