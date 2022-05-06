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
$ npm install -g @contentstack/cli-config
$ csdx COMMAND
running command...
$ csdx (-v|--version|version)
@contentstack/cli-config/1.0.0 darwin-x64 node-v12.22.5
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`csdx config:get:region`](#csdx-configgetregion)
* [`csdx config:set:region [REGION]`](#csdx-configsetregion-region)

## `csdx config:get:region`

CLI_CONFIG_SET_REGION_DESCRIPTION

```
USAGE
  $ csdx config:get:region

EXAMPLE
  $ csdx config:get:region
```

_See code: [src/commands/config/get/region.ts](https://github.com/contentstack/cli/blob/v1.0.0/src/commands/config/get/region.ts)_

## `csdx config:set:region [REGION]`

CLI_CONFIG_SET_REGION_DESCRIPTION

```
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

_See code: [src/commands/config/set/region.ts](https://github.com/contentstack/cli/blob/v1.0.0/src/commands/config/set/region.ts)_
<!-- commandsstop -->
