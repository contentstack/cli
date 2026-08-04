# @contentstack/cli

Use Contentstack Command-line Interface to command Contentstack for executing a set of operations from the terminal. To get started with CLI, refer to the [CLI’s documentation](https://www.contentstack.com/docs/headless-cms/cli)

[![License](https://img.shields.io/npm/l/@contentstack/cli)](https://github.com/contentstack/cli/blob/main/LICENSE)

<!-- toc -->
* [@contentstack/cli](#contentstackcli)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli
$ csdx COMMAND
running command...
$ csdx (--version|-v)
@contentstack/cli/2.0.0-beta.30 darwin-arm64 node-v24.18.0
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
* [`csdx auth:tokens:add [-a <value>] [--delivery] [--management] [-e <value>] [-k <value>] [-y] [--token <value>]`](#csdx-authtokensadd--a-value---delivery---management--e-value--k-value--y---token-value)
* [`csdx auth:tokens:list`](#csdx-authtokenslist)
* [`csdx auth:tokens:remove`](#csdx-authtokensremove)
* [`csdx auth:whoami`](#csdx-authwhoami)
* [`csdx config:get:base-branch`](#csdx-configgetbase-branch)
* [`csdx config:get:ea-header`](#csdx-configgetea-header)
* [`csdx config:get:early-access-header`](#csdx-configgetearly-access-header)
* [`csdx config:get:log`](#csdx-configgetlog)
* [`csdx config:get:proxy`](#csdx-configgetproxy)
* [`csdx config:get:rate-limit`](#csdx-configgetrate-limit)
* [`csdx config:get:region`](#csdx-configgetregion)
* [`csdx config:remove:base-branch`](#csdx-configremovebase-branch)
* [`csdx config:remove:ea-header`](#csdx-configremoveea-header)
* [`csdx config:remove:early-access-header`](#csdx-configremoveearly-access-header)
* [`csdx config:remove:proxy`](#csdx-configremoveproxy)
* [`csdx config:remove:rate-limit`](#csdx-configremoverate-limit)
* [`csdx config:set:base-branch`](#csdx-configsetbase-branch)
* [`csdx config:set:ea-header`](#csdx-configsetea-header)
* [`csdx config:set:early-access-header`](#csdx-configsetearly-access-header)
* [`csdx config:set:log`](#csdx-configsetlog)
* [`csdx config:set:proxy`](#csdx-configsetproxy)
* [`csdx config:set:rate-limit`](#csdx-configsetrate-limit)
* [`csdx config:set:region [REGION]`](#csdx-configsetregion-region)
* [`csdx help [COMMAND]`](#csdx-help-command)
* [`csdx login`](#csdx-login)
* [`csdx logout`](#csdx-logout)
* [`csdx plugins`](#csdx-plugins)
* [`csdx plugins:add PLUGIN`](#csdx-pluginsadd-plugin)
* [`csdx plugins:inspect PLUGIN...`](#csdx-pluginsinspect-plugin)
* [`csdx plugins:install PLUGIN`](#csdx-pluginsinstall-plugin)
* [`csdx plugins:link PATH`](#csdx-pluginslink-path)
* [`csdx plugins:remove [PLUGIN]`](#csdx-pluginsremove-plugin)
* [`csdx plugins:reset`](#csdx-pluginsreset)
* [`csdx plugins:uninstall [PLUGIN]`](#csdx-pluginsuninstall-plugin)
* [`csdx plugins:unlink [PLUGIN]`](#csdx-pluginsunlink-plugin)
* [`csdx plugins:update`](#csdx-pluginsupdate)
* [`csdx whoami`](#csdx-whoami)

## `csdx auth:login`

User sessions login

```
USAGE
  $ csdx auth:login [-u <value> | --oauth] [-p <value> | ]

FLAGS
  -p, --password=<value>  Password of your Contentstack app.
  -u, --username=<value>  Email address of your Contentstack account.
      --oauth             Enables single sign-on (SSO) in Contentstack CLI.

DESCRIPTION
  User sessions login

ALIASES
  $ csdx login

EXAMPLES
  $ csdx auth:login

  $ csdx auth:login -u <username>

  $ csdx auth:login -u <username> -p <password>

  $ csdx auth:login --username <username>

  $ csdx auth:login --username <username> --password <password>
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/main/packages/contentstack-auth/src/commands/auth/login.ts)_

## `csdx auth:logout`

User session logout

```
USAGE
  $ csdx auth:logout [-y]

FLAGS
  -y, --yes  Force log out by skipping the confirmation.

DESCRIPTION
  User session logout

ALIASES
  $ csdx logout

EXAMPLES
  $ csdx auth:logout

  $ csdx auth:logout -y

  $ csdx auth:logout --yes
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/main/packages/contentstack-auth/src/commands/auth/logout.ts)_

## `csdx auth:tokens`

Manage authentication tokens for API access

```
USAGE
  $ csdx auth:tokens [--columns <value>] [--sort <value>] [--filter <value>] [--csv] [--no-truncate]
    [--no-header] [--output csv|json|yaml]

TABLE FLAGS
  --columns=<value>  Specify columns to display, comma-separated.
  --csv              Output results in CSV format.
  --filter=<value>   Filter rows by a column value (e.g., name=foo).
  --no-header        Hide table headers in output.
  --no-truncate      Prevent truncation of long text in columns.
  --output=<option>  Specify output format: csv, json, or yaml.
                     <options: csv|json|yaml>
  --sort=<value>     Sort the table by a column. Use "-" for descending.

DESCRIPTION
  Manage authentication tokens for API access

EXAMPLES
  $ csdx auth:tokens:list

  $ csdx auth:tokens:add --alias mytoken

  $ csdx auth:tokens:remove --alias mytoken
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/main/packages/contentstack-auth/src/commands/auth/tokens/index.ts)_

## `csdx auth:tokens:add [-a <value>] [--delivery] [--management] [-e <value>] [-k <value>] [-y] [--token <value>]`

Adds management/delivery tokens to your session to use it with other CLI commands

```
USAGE
  $ csdx auth:tokens:add [-a <value>] [--delivery] [--management] [-e <value>] [-k <value>] [-y] [--token <value>]

FLAGS
  -a, --alias=<value>          Alias (name) you want to assign to the token
  -e, --environment=<value>    Environment name for delivery token
  -k, --stack-api-key=<value>  Stack API Key
  -y, --yes                    Use this flag to skip confirmation
      --delivery               Set this flag to save delivery token
      --management             Set this flag to save management token
      --token=<value>          [env: TOKEN] Add the token name

DESCRIPTION
  Adds management/delivery tokens to your session to use it with other CLI commands

EXAMPLES
  $ csdx auth:tokens:add

  $ csdx auth:tokens:add -a <alias>

  $ csdx auth:tokens:add -k <stack api key>

  $ csdx auth:tokens:add --delivery

  $ csdx auth:tokens:add --management

  $ csdx auth:tokens:add -e <environment>

  $ csdx auth:tokens:add --token <token>

  $ csdx auth:tokens:add -a <alias> -k <stack api key> --management --token <management token>

  $ csdx auth:tokens:add -a <alias> -k <stack api key> --delivery -e <environment> --token <delivery token>

  $ csdx auth:tokens:add --alias <alias> --stack-api-key <stack api key> --management --token <management token>

  $ csdx auth:tokens:add --alias <alias> --stack-api-key <stack api key> --delivery -e <environment> --token <delivery token>
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/main/packages/contentstack-auth/src/commands/auth/tokens/add.ts)_

## `csdx auth:tokens:list`

Lists all existing tokens added to the session

```
USAGE
  $ csdx auth:tokens:list [--columns <value>] [--sort <value>] [--filter <value>] [--csv] [--no-truncate]
    [--no-header] [--output csv|json|yaml]

TABLE FLAGS
  --columns=<value>  Specify columns to display, comma-separated.
  --csv              Output results in CSV format.
  --filter=<value>   Filter rows by a column value (e.g., name=foo).
  --no-header        Hide table headers in output.
  --no-truncate      Prevent truncation of long text in columns.
  --output=<option>  Specify output format: csv, json, or yaml.
                     <options: csv|json|yaml>
  --sort=<value>     Sort the table by a column. Use "-" for descending.

DESCRIPTION
  Lists all existing tokens added to the session

EXAMPLES
  $ csdx auth:tokens:list
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/main/packages/contentstack-auth/src/commands/auth/tokens/list.ts)_

## `csdx auth:tokens:remove`

Removes selected tokens

```
USAGE
  $ csdx auth:tokens:remove [-a <value>]

FLAGS
  -a, --alias=<value>  Alias (name) of the token to delete.

DESCRIPTION
  Removes selected tokens

EXAMPLES
  $ csdx auth:tokens:remove

  $ csdx auth:tokens:remove -a <alias>
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/main/packages/contentstack-auth/src/commands/auth/tokens/remove.ts)_

## `csdx auth:whoami`

Display current user's email address

```
USAGE
  $ csdx auth:whoami

DESCRIPTION
  Display current user's email address

ALIASES
  $ csdx whoami

EXAMPLES
  $ csdx auth:whoami
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/main/packages/contentstack-auth/src/commands/auth/whoami.ts)_

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

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/get/base-branch.ts)_

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

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/get/early-access-header.ts)_

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

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/get/log.ts)_

## `csdx config:get:proxy`

Get proxy configuration for CLI

```
USAGE
  $ csdx config:get:proxy

DESCRIPTION
  Get proxy configuration for CLI

EXAMPLES
  $ csdx config:get:proxy
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/get/proxy.ts)_

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

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/get/rate-limit.ts)_

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

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/get/region.ts)_

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

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/remove/base-branch.ts)_

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

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/remove/early-access-header.ts)_

## `csdx config:remove:proxy`

Remove proxy configuration from global config

```
USAGE
  $ csdx config:remove:proxy

DESCRIPTION
  Remove proxy configuration from global config

EXAMPLES
  $ csdx config:remove:proxy
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/remove/proxy.ts)_

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

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/remove/rate-limit.ts)_

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

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/set/base-branch.ts)_

## `csdx config:set:ea-header`

Set Early Access header

```
USAGE
  $ csdx config:set:ea-header [--header-alias <value>] [--header <value>]

FLAGS
  --header=<value>        (optional) Provide the Early Access header value.
  --header-alias=<value>  (optional) Provide a name (alias) for this Early Access header.

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
  --header=<value>        (optional) Provide the Early Access header value.
  --header-alias=<value>  (optional) Provide a name (alias) for this Early Access header.

DESCRIPTION
  Set Early Access header

ALIASES
  $ csdx config:set:ea-header

EXAMPLES
  $ csdx config:set:early-access-header

  $ csdx config:set:early-access-header --header <value> --header-alias <value>
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/set/early-access-header.ts)_

## `csdx config:set:log`

Set logging configuration for CLI

```
USAGE
  $ csdx config:set:log [--level debug|info|warn|error] [--path <value>] [--show-console-logs]

FLAGS
  --level=<option>          Set the log level for the CLI. Defaults to "info" if not specified.
                            <options: debug|info|warn|error>
  --path=<value>            Specify the directory path where logs should be saved. Supports both relative and absolute
                            paths. Defaults to ~/.contentstack/logs if not specified.
  --[no-]show-console-logs  Enable console logging.

DESCRIPTION
  Set logging configuration for CLI

EXAMPLES
  $ csdx config:set:log

  $ csdx config:set:log --level debug

  $ csdx config:set:log --path ./logs

  $ csdx config:set:log --level debug --path ./logs --show-console-logs

  $ csdx config:set:log --no-show-console-logs

  $ csdx config:set:log --level warn --show-console-logs

  $ csdx config:set:log --path ~/custom/logs

  $ csdx config:set:log --path /var/log/contentstack
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/set/log.ts)_

## `csdx config:set:proxy`

Set proxy configuration for CLI

```
USAGE
  $ csdx config:set:proxy --host <value> --port <value> --protocol http|https [--username <value>]

FLAGS
  --host=<value>       (required) Proxy host address
  --port=<value>       (required) Proxy port number
  --protocol=<option>  (required) [default: http] Proxy protocol (http or https)
                       <options: http|https>
  --username=<value>   Proxy username (optional)

DESCRIPTION
  Set proxy configuration for CLI

EXAMPLES
  $ csdx config:set:proxy --host 127.0.0.1 --port 3128

  $ csdx config:set:proxy --host proxy.example.com --port 8080 --protocol https

  $ csdx config:set:proxy --host proxy.example.com --port 8080 --username user
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/set/proxy.ts)_

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

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/set/rate-limit.ts)_

## `csdx config:set:region [REGION]`

Set region for CLI

```
USAGE
  $ csdx config:set:region [REGION] [--cda <value> --cma <value> --ui-host <value> --name <value>] [--developer-hub
    <value>] [--personalize <value>] [--launch <value>] [--studio <value>] [--cs-assets <value>] [--auth-api <value>]

ARGUMENTS
  [REGION]  Name for the region

FLAGS
  --auth-api=<value>       Custom host to set for Auth API
  --cda=<value>            Custom host to set for content delivery API, if this flag is added then cma, ui-host and name
                           flags are required
  --cma=<value>            Custom host to set for content management API, , if this flag is added then cda, ui-host and
                           name flags are required
  --cs-assets=<value>      Custom host to set for Contentstack Assets API
  --developer-hub=<value>  Custom host to set for Developer hub API
  --launch=<value>         Custom host to set for Launch API
  --name=<value>           Name for the region, if this flag is added then cda, cma and ui-host flags are required
  --personalize=<value>    Custom host to set for Personalize API
  --studio=<value>         Custom host to set for Studio API
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

  $ csdx config:set:region --cma <custom_cma_host_url> --cda <custom_cda_host_url> --ui-host <custom_ui_host_url> --name "India" --studio <custom_studio_url>

  $ csdx config:set:region --cma <custom_cma_host_url> --cda <custom_cda_host_url> --ui-host <custom_ui_host_url> --name "India" --cs-assets <cs_assets_url>

  $ csdx config:set:region --cda <custom_cda_host_url> --cma <custom_cma_host_url> --ui-host <custom_ui_host_url> --name "India" --developer-hub <custom_developer_hub_url> --launch <custom_launch_url> --personalize <custom_personalize_url> --studio <custom_studio_url> --cs-assets <cs_assets_url>
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/set/region.ts)_

## `csdx help [COMMAND]`

Display help for csdx.

```
USAGE
  $ csdx help [COMMAND...] [-n]

ARGUMENTS
  [COMMAND...]  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for csdx.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/6.2.53/src/commands/help.ts)_

## `csdx login`

User sessions login

```
USAGE
  $ csdx login [-u <value> | --oauth] [-p <value> | ]

FLAGS
  -p, --password=<value>  Password of your Contentstack app.
  -u, --username=<value>  Email address of your Contentstack account.
      --oauth             Enables single sign-on (SSO) in Contentstack CLI.

DESCRIPTION
  User sessions login

ALIASES
  $ csdx login

EXAMPLES
  $ csdx auth:login

  $ csdx auth:login -u <username>

  $ csdx auth:login -u <username> -p <password>

  $ csdx auth:login --username <username>

  $ csdx auth:login --username <username> --password <password>
```

## `csdx logout`

User session logout

```
USAGE
  $ csdx logout [-y]

FLAGS
  -y, --yes  Force log out by skipping the confirmation.

DESCRIPTION
  User session logout

ALIASES
  $ csdx logout

EXAMPLES
  $ csdx auth:logout

  $ csdx auth:logout -y

  $ csdx auth:logout --yes
```

## `csdx plugins`

List installed plugins.

```
USAGE
  $ csdx plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ csdx plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.84/src/commands/plugins/index.ts)_

## `csdx plugins:add PLUGIN`

Installs a plugin into csdx.

```
USAGE
  $ csdx plugins:add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into csdx.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the CSDX_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the CSDX_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ csdx plugins:add

EXAMPLES
  Install a plugin from npm registry.

    $ csdx plugins:add myplugin

  Install a plugin from a github url.

    $ csdx plugins:add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ csdx plugins:add someuser/someplugin
```

## `csdx plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ csdx plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ csdx plugins:inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.84/src/commands/plugins/inspect.ts)_

## `csdx plugins:install PLUGIN`

Installs a plugin into csdx.

```
USAGE
  $ csdx plugins:install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into csdx.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the CSDX_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the CSDX_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ csdx plugins:add

EXAMPLES
  Install a plugin from npm registry.

    $ csdx plugins:install myplugin

  Install a plugin from a github url.

    $ csdx plugins:install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ csdx plugins:install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.84/src/commands/plugins/install.ts)_

## `csdx plugins:link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ csdx plugins:link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ csdx plugins:link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.84/src/commands/plugins/link.ts)_

## `csdx plugins:remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ csdx plugins:remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ csdx plugins:unlink
  $ csdx plugins:remove

EXAMPLES
  $ csdx plugins:remove myplugin
```

## `csdx plugins:reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ csdx plugins:reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.84/src/commands/plugins/reset.ts)_

## `csdx plugins:uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ csdx plugins:uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ csdx plugins:unlink
  $ csdx plugins:remove

EXAMPLES
  $ csdx plugins:uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.84/src/commands/plugins/uninstall.ts)_

## `csdx plugins:unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ csdx plugins:unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ csdx plugins:unlink
  $ csdx plugins:remove

EXAMPLES
  $ csdx plugins:unlink myplugin
```

## `csdx plugins:update`

Update installed plugins.

```
USAGE
  $ csdx plugins:update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.84/src/commands/plugins/update.ts)_

## `csdx whoami`

Display current user's email address

```
USAGE
  $ csdx whoami

DESCRIPTION
  Display current user's email address

ALIASES
  $ csdx whoami

EXAMPLES
  $ csdx auth:whoami
```
<!-- commandsstop -->
