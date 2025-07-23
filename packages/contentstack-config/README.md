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
@contentstack/cli-config/1.14.0 darwin-arm64 node-v22.14.0
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
* [`csdx config:get:log`](#csdx-configgetlog)
* [`csdx config:get:rate-limit`](#csdx-configgetrate-limit)
* [`csdx config:get:region`](#csdx-configgetregion)
* [`csdx config:remove:base-branch`](#csdx-configremovebase-branch)
* [`csdx config:remove:ea-header`](#csdx-configremoveea-header)
* [`csdx config:remove:early-access-header`](#csdx-configremoveearly-access-header)
* [`csdx config:remove:rate-limit`](#csdx-configremoverate-limit)
* [`csdx config:set:base-branch`](#csdx-configsetbase-branch)
* [`csdx config:set:ea-header`](#csdx-configsetea-header)
* [`csdx config:set:early-access-header`](#csdx-configsetearly-access-header)
* [`csdx config:set:log`](#csdx-configsetlog)
* [`csdx config:set:rate-limit`](#csdx-configsetrate-limit)
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

Display Early Access headers

```
USAGE
  $ csdx config:get:ea-header

DESCRIPTION
  Display Early Access headers

ALIASES
  $ csdx config:get:ea-header

EXAMPLES
  $ csdx config:get:ea-header
```

## `csdx config:get:early-access-header`

Display Early Access headers

```
USAGE
  $ csdx config:get:early-access-header

DESCRIPTION
  Display Early Access headers

ALIASES
  $ csdx config:get:ea-header

EXAMPLES
  $ csdx config:get:early-access-header
```

_See code: [src/commands/config/get/early-access-header.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/get/early-access-header.ts)_

## `csdx config:get:log`

Get logging configuration for CLI

```
USAGE
  $ csdx config:get:log

DESCRIPTION
  Get logging configuration for CLI

EXAMPLES
  $ csdx config:get:log
```

_See code: [src/commands/config/get/log.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/get/log.ts)_

## `csdx config:get:rate-limit`

Get rate-limit of organizations

```
USAGE
  $ csdx config:get:rate-limit

DESCRIPTION
  Get rate-limit of organizations

EXAMPLES
  $ csdx config:get:rate-limit
```

_See code: [src/commands/config/get/rate-limit.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/get/rate-limit.ts)_

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
  -k, --stack-api-key=<value>  Stack API key.
  -y, --yes                    Force remove.

DESCRIPTION
  Remove branch config for CLI

EXAMPLES
  $ csdx config:remove:base-branch

  $ csdx config:remove:base-branch --stack-api-key <value>
```

_See code: [src/commands/config/remove/base-branch.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/remove/base-branch.ts)_

## `csdx config:remove:ea-header`

Remove Early Access header

```
USAGE
  $ csdx config:remove:ea-header [--header-alias <value>] [-y]

FLAGS
  -y, --yes                   (optional) Force the removal of Early Access header configuration by skipping the
                              confirmation.
      --header-alias=<value>  (optional) Provide the Early Access header alias name.

DESCRIPTION
  Remove Early Access header

ALIASES
  $ csdx config:remove:ea-header

EXAMPLES
  $ csdx config:remove:ea-header

  $ csdx config:remove:ea-header --header-alias <value>
```

## `csdx config:remove:early-access-header`

Remove Early Access header

```
USAGE
  $ csdx config:remove:early-access-header [--header-alias <value>] [-y]

FLAGS
  -y, --yes                   (optional) Force the removal of Early Access header configuration by skipping the
                              confirmation.
      --header-alias=<value>  (optional) Provide the Early Access header alias name.

DESCRIPTION
  Remove Early Access header

ALIASES
  $ csdx config:remove:ea-header

EXAMPLES
  $ csdx config:remove:early-access-header

  $ csdx config:remove:early-access-header --header-alias <value>
```

_See code: [src/commands/config/remove/early-access-header.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/remove/early-access-header.ts)_

## `csdx config:remove:rate-limit`

Remove rate-limit of the organization

```
USAGE
  $ csdx config:remove:rate-limit [--org <value>]

FLAGS
  --org=<value>  Provide the organization UID

DESCRIPTION
  Remove rate-limit of the organization

EXAMPLES
  $ csdx config:remove:rate-limit --org <<org_uid>>
```

_See code: [src/commands/config/remove/rate-limit.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/remove/rate-limit.ts)_

## `csdx config:set:base-branch`

Set branch for CLI

```
USAGE
  $ csdx config:set:base-branch [-k <value>] [--base-branch <value>]

FLAGS
  -k, --stack-api-key=<value>  Stack API key
      --base-branch=<value>    Base branch (Target branch).

DESCRIPTION
  Set branch for CLI

EXAMPLES
  $ csdx config:set:base-branch

  $ csdx config:set:base-branch --stack-api-key <value> --base-branch <value>
```

_See code: [src/commands/config/set/base-branch.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/set/base-branch.ts)_

## `csdx config:set:ea-header`

Set Early Access header

```
USAGE
  $ csdx config:set:ea-header [--header-alias <value>] [--header <value>]

FLAGS
  --header=<value>        (optional) Provide the Early Access header alias name.
  --header-alias=<value>  (optional) Provide the Early Access header value.

DESCRIPTION
  Set Early Access header

ALIASES
  $ csdx config:set:ea-header

EXAMPLES
  $ csdx config:set:ea-header

  $ csdx config:set:ea-header --header <value> --header-alias <value>
```

## `csdx config:set:early-access-header`

Set Early Access header

```
USAGE
  $ csdx config:set:early-access-header [--header-alias <value>] [--header <value>]

FLAGS
  --header=<value>        (optional) Provide the Early Access header alias name.
  --header-alias=<value>  (optional) Provide the Early Access header value.

DESCRIPTION
  Set Early Access header

ALIASES
  $ csdx config:set:ea-header

EXAMPLES
  $ csdx config:set:early-access-header

  $ csdx config:set:early-access-header --header <value> --header-alias <value>
```

_See code: [src/commands/config/set/early-access-header.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/set/early-access-header.ts)_

## `csdx config:set:log`

Set logging configuration for CLI

```
USAGE
  $ csdx config:set:log [--level debug|info|warn|error] [--path <value>]

FLAGS
  --level=<option>  Set the log level for the CLI.
                    <options: debug|info|warn|error>
  --path=<value>    Specify the file path where logs should be saved.

DESCRIPTION
  Set logging configuration for CLI

EXAMPLES
  $ csdx config:set:log

  $ csdx config:set:log --level debug --path ./logs/app.log
```

_See code: [src/commands/config/set/log.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/set/log.ts)_

## `csdx config:set:rate-limit`

Set rate-limit for CLI

```
USAGE
  $ csdx config:set:rate-limit [--org <value>] [--utilize <value>] [--limit-name <value>...] [--default]

FLAGS
  --default                Reset to default rate limit
  --limit-name=<value>...  [Optional] Provide the limit names separated by commas ['limit', 'getLimit', 'bulkLimit']
  --org=<value>            Provide the organization UID
  --utilize=<value>        [default: 50] Provide the utilization percentages for rate limit, separated by commas

DESCRIPTION
  Set rate-limit for CLI

EXAMPLES
  $ csdx config:set:rate-limit --org <<org_uid>>

  $ csdx config:set:rate-limit --org <<org_uid>> --utilize 70,80 --limit-name getLimit,limit

  $ csdx config:set:rate-limit --org <<org_uid>> --default
```

_See code: [src/commands/config/set/rate-limit.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/set/rate-limit.ts)_

## `csdx config:set:region [REGION]`

Set region for CLI

```
USAGE
  $ csdx config:set:region [REGION] [-d <value> -m <value> --ui-host <value> -n <value>] [--developer-hub <value>]
    [--personalize <value>] [--launch <value>]

ARGUMENTS
  REGION  Name for the region

FLAGS
  -d, --cda=<value>            Custom host to set for content delivery API, if this flag is added then cma, ui-host and
                               name flags are required
  -m, --cma=<value>            Custom host to set for content management API, , if this flag is added then cda, ui-host
                               and name flags are required
  -n, --name=<value>           Name for the region, if this flag is added then cda, cma and ui-host flags are required
      --developer-hub=<value>  Custom host to set for Developer hub API
      --launch=<value>         Custom host to set for Launch API
      --personalize=<value>    Custom host to set for Personalize API
      --ui-host=<value>        Custom UI host to set for CLI, if this flag is added then cda, cma and name flags are
                               required

DESCRIPTION
  Set region for CLI

EXAMPLES
  $ csdx config:set:region

  $ csdx config:set:region AWS-NA

  $ csdx config:set:region AWS-EU

  $ csdx config:set:region AWS-AU

  $ csdx config:set:region AZURE-NA

  $ csdx config:set:region AZURE-EU

  $ csdx config:set:region GCP-NA

  $ csdx config:set:region GCP-EU

  $ csdx config:set:region --cma <custom_cma_host_url> --cda <custom_cda_host_url> --ui-host <custom_ui_host_url> --name "India"

  $ csdx config:set:region --cma <custom_cma_host_url> --cda <custom_cda_host_url> --ui-host <custom_ui_host_url> --name "India" --developer-hub <custom_developer_hub_url>

  $ csdx config:set:region --cma <custom_cma_host_url> --cda <custom_cda_host_url> --ui-host <custom_ui_host_url> --name "India" --personalize <custom_personalize_url>

  $ csdx config:set:region --cma <custom_cma_host_url> --cda <custom_cda_host_url> --ui-host <custom_ui_host_url> --name "India" --launch <custom_launch_url>

  $ csdx config:set:region --cda <custom_cda_host_url> --cma <custom_cma_host_url> --ui-host <custom_ui_host_url> --name "India" --developer-hub <custom_developer_hub_url> --launch <custom_launch_url> --personalize <custom_personalize_url>
```

_See code: [src/commands/config/set/region.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/set/region.ts)_
<!-- commandsstop -->
