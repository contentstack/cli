`csdx plugins`
==============

list installed plugins

* [`csdx plugins`](#csdx-plugins)
* [`csdx plugins:install PLUGIN...`](#csdx-pluginsinstall-plugin)
* [`csdx plugins:link PLUGIN`](#csdx-pluginslink-plugin)
* [`csdx plugins:uninstall PLUGIN...`](#csdx-pluginsuninstall-plugin)
* [`csdx plugins:update`](#csdx-pluginsupdate)

## `csdx plugins`

list installed plugins

```
USAGE
  $ csdx plugins

OPTIONS
  --core  show core plugins

EXAMPLE
  $ csdx plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.9.0/src/commands/plugins/index.ts)_

## `csdx plugins:install PLUGIN...`

installs a plugin into the CLI

```
USAGE
  $ csdx plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  plugin to install

OPTIONS
  -f, --force    yarn install with force flag
  -h, --help     show CLI help
  -v, --verbose

DESCRIPTION
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command 
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in 
  the CLI without the need to patch and update the whole CLI.

ALIASES
  $ csdx plugins:add

EXAMPLES
  $ csdx plugins:install myplugin 
  $ csdx plugins:install https://github.com/someuser/someplugin
  $ csdx plugins:install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.9.0/src/commands/plugins/install.ts)_

## `csdx plugins:link PLUGIN`

links a plugin into the CLI for development

```
USAGE
  $ csdx plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

OPTIONS
  -h, --help     show CLI help
  -v, --verbose

DESCRIPTION
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello' 
  command will override the user-installed or core plugin implementation. This is useful for development work.

EXAMPLE
  $ csdx plugins:link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.9.0/src/commands/plugins/link.ts)_

## `csdx plugins:uninstall PLUGIN...`

removes a plugin from the CLI

```
USAGE
  $ csdx plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

OPTIONS
  -h, --help     show CLI help
  -v, --verbose

ALIASES
  $ csdx plugins:unlink
  $ csdx plugins:remove
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.9.0/src/commands/plugins/uninstall.ts)_

## `csdx plugins:update`

update installed plugins

```
USAGE
  $ csdx plugins:update

OPTIONS
  -h, --help     show CLI help
  -v, --verbose
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.9.0/src/commands/plugins/update.ts)_
