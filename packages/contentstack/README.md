@contentstack/cli-auth
===

It is Contentstack’s CLI plugin to perform authentication-related activities. To get started with authenticating yourself with the CLI, refer to the [CLI’s Authentication documentation](https://www.contentstack.com/docs/developers/cli/authentication)

[![License](https://img.shields.io/npm/l/@contentstack/cli)](https://github.com/contentstack/cli/blob/main/LICENSE)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli
$ csdx COMMAND
running command...
$ csdx (-v|--version|version)
@contentstack/cli/0.1.1-beta.1 linux-x64 node-v12.22.7
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`csdx auth:login`](#csdx-authlogin)
* [`csdx auth:logout`](#csdx-authlogout)
* [`csdx auth:tokens`](#csdx-authtokens)
* [`csdx auth:tokens:add`](#csdx-authtokensadd)
* [`csdx auth:tokens:remove`](#csdx-authtokensremove)
* [`csdx auth:whoami`](#csdx-authwhoami)
* [`csdx cm:export`](#csdx-cmexport)
* [`csdx cm:import`](#csdx-cmimport)
* [`csdx config:get:region`](#csdx-configgetregion)
* [`csdx config:set:region [REGION]`](#csdx-configsetregion-region)
* [`csdx help [COMMAND]`](#csdx-help-command)
* [`csdx plugins`](#csdx-plugins)
* [`csdx plugins:inspect PLUGIN...`](#csdx-pluginsinspect-plugin)
* [`csdx plugins:install PLUGIN...`](#csdx-pluginsinstall-plugin)
* [`csdx plugins:link PLUGIN`](#csdx-pluginslink-plugin)
* [`csdx plugins:uninstall PLUGIN...`](#csdx-pluginsuninstall-plugin)
* [`csdx plugins:update`](#csdx-pluginsupdate)

## `csdx auth:login`

CLI_AUTH_LOGIN_DESCRIPTION

```
CLI_AUTH_LOGIN_DESCRIPTION

USAGE
  $ csdx auth:login

OPTIONS
  -p, --password=password  CLI_AUTH_LOGIN_FLAG_PASSWORD
  -u, --username=username  CLI_AUTH_LOGIN_FLAG_USERNAME

EXAMPLES
  $ csdx auth:login
  $ csdx auth:login -u <username>
  $ csdx auth:login -u <username> -p <password>
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/v0.1.1-beta.1/src/commands/auth/login.ts)_

## `csdx auth:logout`

CLI_AUTH_LOGOUT_DESCRIPTION

```
CLI_AUTH_LOGOUT_DESCRIPTION

USAGE
  $ csdx auth:logout

OPTIONS
  -f, --force  CLI_AUTH_LOGOUT_FLAG_FORCE

EXAMPLES
  $ csdx auth:logout
  $ csdx auth:logout -f
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/v0.1.1-beta.1/src/commands/auth/logout.ts)_

## `csdx auth:tokens`

CLI_AUTH_TOKENS_LIST_DESCRIPTION

```
CLI_AUTH_TOKENS_LIST_DESCRIPTION

USAGE
  $ csdx auth:tokens

OPTIONS
  -x, --extended          show extra columns
  --columns=columns       only show provided columns (comma-separated)
  --csv                   output is csv format [alias: --output=csv]
  --filter=filter         filter property by partial string matching, ex: name=foo
  --no-header             hide table header from output
  --no-truncate           do not truncate output to fit screen
  --output=csv|json|yaml  output in a more machine friendly format
  --sort=sort             property to sort by (prepend '-' for descending)

ALIASES
  $ csdx tokens

EXAMPLE
  $ csdx auth:tokens
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/v0.1.1-beta.1/src/commands/auth/tokens/index.ts)_

## `csdx auth:tokens:add`

CLI_AUTH_TOKENS_ADD_DESCRIPTION

```
CLI_AUTH_TOKENS_ADD_DESCRIPTION

USAGE
  $ csdx auth:tokens:add

OPTIONS
  -a, --alias=alias
  -d, --delivery                 CLI_AUTH_TOKENS_ADD_FLAG__DELIVERY_TOKEN
  -e, --environment=environment  CLI_AUTH_TOKENS_ADD_FLAG_ENVIRONMENT_NAME
  -f, --force                    Force adding
  -k, --api-key=api-key          API Key
  -m, --management               CLI_AUTH_TOKENS_ADD_FLAG_MANAGEMENT_TOKEN
  -t, --token=token              Token

EXAMPLES
  $ csdx auth:tokens:add
  $ csdx auth:tokens:add -a <alias>
  $ csdx auth:tokens:add -k <api key>
  $ csdx auth:tokens:add -d
  $ csdx auth:tokens:add -m
  $ csdx auth:tokens:add -e <environment>
  $ csdx auth:tokens:add -t <token>
  $ csdx auth:tokens:add -a <alias> -k <api key> -m -t <management token>
  $ csdx auth:tokens:add -a <alias> -k <api key> -d -e <environment> -t <delivery token>
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/v0.1.1-beta.1/src/commands/auth/tokens/add.ts)_

## `csdx auth:tokens:remove`

CLI_AUTH_TOKENS_REMOVE_DESCRIPTION

```
CLI_AUTH_TOKENS_REMOVE_DESCRIPTION

USAGE
  $ csdx auth:tokens:remove

OPTIONS
  -a, --alias=alias  Token alias
  -i, --ignore       Ignore

EXAMPLES
  $ csdx auth:tokens:remove
  $ csdx auth:tokens:remove -a <aliase>
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/v0.1.1-beta.1/src/commands/auth/tokens/remove.ts)_

## `csdx auth:whoami`

CLI_AUTH_WHOAMI_DESCRIPTION

```
CLI_AUTH_WHOAMI_DESCRIPTION

USAGE
  $ csdx auth:whoami

ALIASES
  $ csdx whoami

EXAMPLE
  $ csdx auth:whoami
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/v0.1.1-beta.1/src/commands/auth/whoami.ts)_

## `csdx cm:export`

Export content from a stack

```
Export content from a stack

USAGE
  $ csdx cm:export

OPTIONS
  -a, --mtoken-alias=mtoken-alias                  alias of the management token
  -b, --branch=branch                              [optional] branch name
  -c, --external-config-path=external-config-path  [optional] path of the config
  -d, --export-dir=export-dir                      path or location to store the data
  -k, --api-key=api-key                            API key of the source stack
  -m, --module=module                              [optional] specific module name
  -t, --content-type=content-type                  [optional] content type

EXAMPLES
  csdx cm:export
  csdx cm:export -k <stack_ApiKey> -d <path/of/export/destination/dir>
  csdx cm:export -m <single module name>
  csdx cm:export -m <single module name> -k <stack_ApiKey> -d <path/of/export/destination/dir>
  csdx cm:export -m <single module name> -t <content type>
  csdx cm:export -b [optional] branch name
  csdx cm:export -c <path/to/config/dir>
  csdx cm:export -a <management_token_alias>
  csdx cm:export -a <management_token_alias> -d <path/to/export/destination/dir>
  csdx cm:export -a <management_token_alias> -c <path/to/config/file>
```

_See code: [@contentstack/cli-cm-export](https://github.com/contentstack/cli/blob/v0.1.1-beta.1/src/commands/cm/export.ts)_

## `csdx cm:import`

Import script for importing the content into new stack

```
Import script for importing the content into new stack
...
Once you export content from the source stack, import it to your destination stack by using the cm:import command.


USAGE
  $ csdx cm:import

OPTIONS
  -A, --auth-token                                     to use auth token
  -a, --management-token-alias=management-token-alias  alias of the management token
  -c, --config=config                                  [optional] path of config file
  -d, --data=data                                      path and location where data is stored
  -l, --master-lang=master-lang                        code of the target stack's master language
  -m, --module=module                                  [optional] specific module name
  -s, --stack-uid=stack-uid                            API key of the target stack

DESCRIPTION
  ...
  Once you export content from the source stack, import it to your destination stack by using the cm:import command.

EXAMPLES
  csdx cm:import -A
  csdx cm:import -A -l "master-language" -s "stack_ApiKey" -d "path/of/export/destination/dir"
  csdx cm:import -A -c "path/of/config/dir"
  csdx cm:import -a "management_token_alias"
  csdx cm:import -a "management_token_alias" -l "master-language" -d "path/of/export/destination/dir"
  csdx cm:import -a "management_token_alias" -c "path/of/config/file"
  csdx cm:import -A -m "single module name"
```

_See code: [@contentstack/cli-cm-import](https://github.com/contentstack/cli/blob/v0.1.1-beta.1/packages/contentstack-import/src/commands/cm/import.js)_

## `csdx config:get:region`

CLI_CONFIG_SET_REGION_DESCRIPTION

```
CLI_CONFIG_SET_REGION_DESCRIPTION

USAGE
  $ csdx config:get:region

EXAMPLE
  $ csdx config:get:region
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/v0.1.1-beta.1/src/commands/config/get/region.ts)_

## `csdx config:set:region [REGION]`

CLI_CONFIG_SET_REGION_DESCRIPTION

```
CLI_CONFIG_SET_REGION_DESCRIPTION

USAGE
  $ csdx config:set:region [REGION]

OPTIONS
  -d, --cda=cda    CLI_CONFIG_SET_REGION_FLAG_D_DESCRIPTION
  -m, --cma=cma    CLI_CONFIG_SET_REGION_FLAG_M_DESCRIPTION
  -n, --name=name  CLI_CONFIG_SET_REGION_FLAG_N_DESCRIPTION

EXAMPLES
  $ csdx config:set:region
  $ csdx config:set:region NA
  $ csdx config:set:region NA
  $ csdx config:set:region --cma <contentstack_cma_endpoint> --cda <contentstack_cda_endpoint> --name "India"
  $ csdx config:set:region --cma="https://in-api.contentstack.com" --cda="https://in-cda.contentstack.com" 
  --name="India"
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/v0.1.1-beta.1/src/commands/config/set/region.ts)_

## `csdx help [COMMAND]`

display help for csdx

```
display help for <%= config.bin %>

USAGE
  $ csdx help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.2.3/src/commands/help.ts)_

## `csdx plugins`

list installed plugins

```
list installed plugins

USAGE
  $ csdx plugins

OPTIONS
  --core  show core plugins

EXAMPLE
  $ csdx plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.10.0/src/commands/plugins/index.ts)_

## `csdx plugins:inspect PLUGIN...`

displays installation properties of a plugin

```
displays installation properties of a plugin

USAGE
  $ csdx plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] plugin to inspect

OPTIONS
  -h, --help     show CLI help
  -v, --verbose

EXAMPLE
  $ csdx plugins:inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.10.0/src/commands/plugins/inspect.ts)_

## `csdx plugins:install PLUGIN...`

installs a plugin into the CLI

```
installs a plugin into the CLI
Can be installed from npm or a git url.

Installation of a user-installed plugin will override a core plugin.

e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in the CLI without the need to patch and update the whole CLI.


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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.10.0/src/commands/plugins/install.ts)_

## `csdx plugins:link PLUGIN`

links a plugin into the CLI for development

```
links a plugin into the CLI for development
Installation of a linked plugin will override a user-installed or core plugin.

e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello' command will override the user-installed or core plugin implementation. This is useful for development work.


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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.10.0/src/commands/plugins/link.ts)_

## `csdx plugins:uninstall PLUGIN...`

removes a plugin from the CLI

```
removes a plugin from the CLI

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.10.0/src/commands/plugins/uninstall.ts)_

## `csdx plugins:update`

update installed plugins

```
update installed plugins

USAGE
  $ csdx plugins:update

OPTIONS
  -h, --help     show CLI help
  -v, --verbose
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.10.0/src/commands/plugins/update.ts)_
<!-- commandsstop -->
