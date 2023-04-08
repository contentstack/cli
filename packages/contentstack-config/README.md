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
$ csdx (--version)
@contentstack/cli-config/1.3.0 darwin-arm64 node-v16.19.1
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`csdx config:get:base-branch`](#csdx-configgetbase-branch)
* [`csdx config:get:branch`](#csdx-configgetbranch)
* [`csdx config:get:region`](#csdx-configgetregion)
* [`csdx config:remove:base-branch`](#csdx-configremovebase-branch)
* [`csdx config:set:base-branch`](#csdx-configsetbase-branch)
* [`csdx config:set:branch`](#csdx-configsetbranch)
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

## `csdx config:get:branch`

Get current branch set for CLI

```
USAGE
  $ csdx config:get:branch

DESCRIPTION
  Get current branch set for CLI

EXAMPLES
  $ csdx config:get:branch
```

_See code: [src/commands/config/get/branch.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/get/branch.ts)_

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

## `csdx config:set:base-branch`

Set branch for CLI

```
USAGE
  $ csdx config:set:base-branch [-k <value>] [-b <value>]

FLAGS
  -b, --base-branch=<value>    Base Branch
  -k, --stack-api-key=<value>  Stack API Key

DESCRIPTION
  Set branch for CLI

EXAMPLES
  $ csdx config:set:base-branch

  $ csdx config:set:base-branch --stack-api-key <value> --base-branch <value>
```

_See code: [src/commands/config/set/base-branch.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/set/base-branch.ts)_

## `csdx config:set:branch`

Set branch for CLI

```
USAGE
  $ csdx config:set:branch [-k <value>] [-b <value>]

FLAGS
  -b, --base-branch=<value>    Base Branch
  -k, --stack-api-key=<value>  Stack API Key

DESCRIPTION
  Set branch for CLI

EXAMPLES
  $ csdx config:set:branch

  $ csdx config:set:branch --stack-api-key <value> --base-branch <value>
```

_See code: [src/commands/config/set/branch.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/set/branch.ts)_

## `csdx config:set:region [REGION]`

Set region for CLI

```
USAGE
  $ csdx config:set:region [REGION] [-d <value> -m <value> -n <value>]

ARGUMENTS
  REGION  Name for the region

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

_See code: [src/commands/config/set/region.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/set/region.ts)_
<!-- commandsstop -->
