# @contentstack/cli-config

The config namespace contains all the commands that you will need to configure the CLI as per your requirements. Contentstack currently supports four regions: North America, Europe, Azure North America and Azure Europe. [Configure the CLI documentation](https://www.contentstack.com/docs/developers/cli/configure-the-cli)

[![License](https://img.shields.io/npm/l/@contentstack/cli)](https://github.com/contentstack/cli/blob/main/LICENSE)

<!-- toc -->
* [@contentstack/cli-config](#contentstackcli-config)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli-config
$ csdx COMMAND
running command...
$ csdx (--version)
@contentstack/cli-config/1.5.1 darwin-arm64 node-v20.8.0
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`csdx config:get:base-branch`](#csdx-configgetbase-branch)
* [`csdx config:get:ea-header`](#csdx-configgetea-header)
* [`csdx config:get:early-access-header`](#csdx-configgetearly-access-header)
* [`csdx config:get:region`](#csdx-configgetregion)
* [`csdx config:remove:base-branch`](#csdx-configremovebase-branch)
* [`csdx config:remove:ea-header`](#csdx-configremoveea-header)
* [`csdx config:remove:early-access-header`](#csdx-configremoveearly-access-header)
* [`csdx config:set:base-branch`](#csdx-configsetbase-branch)
* [`csdx config:set:ea-header`](#csdx-configsetea-header)
* [`csdx config:set:early-access-header`](#csdx-configsetearly-access-header)
* [`csdx config:set:region [REGION]`](#csdx-configsetregion-region)

## `csdx config:get:base-branch`

Get current branch set for CLI

```
USAGE
  $ csdx config:get:base-branch

DESCRIPTION
  Get current branch set for CLI

EXAMPLES
  $ csdx config:get:base-branch
```

_See code: [src/commands/config/get/base-branch.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/get/base-branch.ts)_

## `csdx config:get:ea-header`

Display Early Access Program headers

```
USAGE
  $ csdx config:get:ea-header

DESCRIPTION
  Display Early Access Program headers

ALIASES
  $ csdx config:get:ea-header

EXAMPLES
  $ csdx config:get:ea-header
```

## `csdx config:get:early-access-header`

Display Early Access Program headers

```
USAGE
  $ csdx config:get:early-access-header

DESCRIPTION
  Display Early Access Program headers

ALIASES
  $ csdx config:get:ea-header

EXAMPLES
  $ csdx config:get:early-access-header
```

_See code: [src/commands/config/get/early-access-header.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/get/early-access-header.ts)_

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

_See code: [src/commands/config/get/region.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/get/region.ts)_

## `csdx config:remove:base-branch`

Remove branch config for CLI

```
USAGE
  $ csdx config:remove:base-branch [-k <value>] [-y]

FLAGS
  -k, --stack-api-key=<value>  Stack API Key
  -y, --yes                    Force Remove

DESCRIPTION
  Remove branch config for CLI

EXAMPLES
  $ csdx config:remove:base-branch

  $ csdx config:remove:base-branch --stack-api-key <value>
```

_See code: [src/commands/config/remove/base-branch.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/remove/base-branch.ts)_

## `csdx config:remove:ea-header`

Remove Early Access Program header

```
USAGE
  $ csdx config:remove:ea-header [--header-alias <value>] [-y]

FLAGS
  -y, --yes               Force Remove
  --header-alias=<value>  Early access header alias

DESCRIPTION
  Remove Early Access Program header

ALIASES
  $ csdx config:remove:ea-header

EXAMPLES
  $ csdx config:remove:ea-header

  $ csdx config:remove:ea-header --header-alias <value>
```

## `csdx config:remove:early-access-header`

Remove Early Access Program header

```
USAGE
  $ csdx config:remove:early-access-header [--header-alias <value>] [-y]

FLAGS
  -y, --yes               Force Remove
  --header-alias=<value>  Early access header alias

DESCRIPTION
  Remove Early Access Program header

ALIASES
  $ csdx config:remove:ea-header

EXAMPLES
  $ csdx config:remove:early-access-header

  $ csdx config:remove:early-access-header --header-alias <value>
```

_See code: [src/commands/config/remove/early-access-header.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/remove/early-access-header.ts)_

## `csdx config:set:base-branch`

Set branch for CLI

```
USAGE
  $ csdx config:set:base-branch [-k <value>] [--base-branch <value>]

FLAGS
  -k, --stack-api-key=<value>  Stack API Key
  --base-branch=<value>        Base Branch

DESCRIPTION
  Set branch for CLI

EXAMPLES
  $ csdx config:set:base-branch

  $ csdx config:set:base-branch --stack-api-key <value> --base-branch <value>
```

_See code: [src/commands/config/set/base-branch.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/set/base-branch.ts)_

## `csdx config:set:ea-header`

Set Early Access Program header

```
USAGE
  $ csdx config:set:ea-header [--header-alias <value>] [--header <value>]

FLAGS
  --header=<value>        Early access header value
  --header-alias=<value>  Early access header alias

DESCRIPTION
  Set Early Access Program header

ALIASES
  $ csdx config:set:ea-header

EXAMPLES
  $ csdx config:set:ea-header

  $ csdx config:set:ea-header --header <value> --header-alias <value>
```

## `csdx config:set:early-access-header`

Set Early Access Program header

```
USAGE
  $ csdx config:set:early-access-header [--header-alias <value>] [--header <value>]

FLAGS
  --header=<value>        Early access header value
  --header-alias=<value>  Early access header alias

DESCRIPTION
  Set Early Access Program header

ALIASES
  $ csdx config:set:ea-header

EXAMPLES
  $ csdx config:set:early-access-header

  $ csdx config:set:early-access-header --header <value> --header-alias <value>
```

_See code: [src/commands/config/set/early-access-header.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/set/early-access-header.ts)_

## `csdx config:set:region [REGION]`

Set region for CLI

```
USAGE
  $ csdx config:set:region [REGION] [-d <value> -m <value> --ui-host <value> -n <value>]

ARGUMENTS
  REGION  Name for the region

FLAGS
  -d, --cda=<value>   Custom host to set for content delivery API, if this flag is added then cma, ui-host and name
                      flags are required
  -m, --cma=<value>   Custom host to set for content management API, , if this flag is added then cda, ui-host and name
                      flags are required
  -n, --name=<value>  Name for the region, if this flag is added then cda, cma and ui-host flags are required
  --ui-host=<value>   Custom UI host to set for CLI, if this flag is added then cda, cma and name flags are required

DESCRIPTION
  Set region for CLI

EXAMPLES
  $ csdx config:set:region

  $ csdx config:set:region NA

  $ csdx config:set:region EU

  $ csdx config:set:region AZURE-NA

  $ csdx config:set:region AZURE-EU

  $ csdx config:set:region --cma <contentstack_cma_endpoint> --cda <contentstack_cda_endpoint> --ui-host <contentstack_ui_host_endpoint> --name "India"
```

_See code: [src/commands/config/set/region.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/set/region.ts)_
<!-- commandsstop -->
