@contentstack/cli-config
===

The config namespace contains all the commands that you will need to configure the CLI as per your requirements. Contentstack currently supports three regions: North America, Europe and Azure North America. [Configure the CLI documentation](https://www.contentstack.com/docs/developers/cli/configure-the-cli)

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
@contentstack/cli-config/1.0.0 darwin-x64 node-v16.17.0
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

Get current region set for CLI

```
USAGE
  $ csdx config:get:region

DESCRIPTION
  Get current region set for CLI

EXAMPLES
  $ csdx config:get:region
```

_See code: [src/commands/config/get/region.ts](https://github.com/contentstack/cli/blob/v1.0.0/src/commands/config/get/region.ts)_

## `csdx config:set:region [REGION]`

Set region for CLI

```
USAGE
  $ csdx config:set:region [REGION] [-d <value> -m <value> -n <value>]

FLAGS
  -d, --cda=<value>   Custom host to set for content delivery API, if this flag is added then cma and name flags are
                      required
  -m, --cma=<value>   Custom host to set for content management API, , if this flag is added then cda and name flags are
                      required
  -n, --name=<value>  Name for the region, if this flag is added then cda and cma flags are required

DESCRIPTION
  Set region for CLI

EXAMPLES
  $ csdx config:set:region

  $ csdx config:set:region NA

  $ csdx config:set:region NA

  $ csdx config:set:region --cma <contentstack_cma_endpoint> --cda <contentstack_cda_endpoint> --name "India"
```

_See code: [src/commands/config/set/region.ts](https://github.com/contentstack/cli/blob/v1.0.0/src/commands/config/set/region.ts)_
<!-- commandsstop -->
