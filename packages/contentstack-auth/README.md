# @contentstack/cli-auth

It is Contentstack’s CLI plugin to perform authentication-related activities. To get started with authentication, refer to the [CLI’s Authentication documentation](https://www.contentstack.com/docs/developers/cli/authentication)

[![License](https://img.shields.io/npm/l/@contentstack/cli)](https://github.com/contentstack/cli/blob/main/LICENSE)

<!-- toc -->
* [@contentstack/cli-auth](#contentstackcli-auth)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli-auth
$ csdx COMMAND
running command...
$ csdx (--version)
@contentstack/cli-auth/2.0.0-beta.13 darwin-arm64 node-v22.23.1
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
* [`csdx auth:whoami`](#csdx-authwhoami)
* [`csdx login`](#csdx-login)
* [`csdx logout`](#csdx-logout)
* [`csdx tokens`](#csdx-tokens)
* [`csdx tokens:add [-a <value>] [--delivery] [--management] [-e <value>] [-k <value>] [-y] [--token <value>]`](#csdx-tokensadd--a-value---delivery---management--e-value--k-value--y---token-value)
* [`csdx tokens:list`](#csdx-tokenslist)
* [`csdx tokens:remove`](#csdx-tokensremove)
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

_See code: [src/commands/auth/login.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-auth/src/commands/auth/login.ts)_

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

_See code: [src/commands/auth/logout.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-auth/src/commands/auth/logout.ts)_

## `csdx auth:whoami`

Display current users email address

```
USAGE
  $ csdx auth:whoami

DESCRIPTION
  Display current users email address

ALIASES
  $ csdx whoami

EXAMPLES
  $ csdx auth:whoami
```

_See code: [src/commands/auth/whoami.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-auth/src/commands/auth/whoami.ts)_

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

## `csdx tokens`

Manage authentication tokens for API access

```
USAGE
  $ csdx tokens [--columns <value>] [--sort <value>] [--filter <value>] [--csv] [--no-truncate]
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
  $ csdx tokens:list

  $ csdx tokens:add --alias mytoken

  $ csdx tokens:remove --alias mytoken
```

_See code: [src/commands/tokens/index.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-auth/src/commands/tokens/index.ts)_

## `csdx tokens:add [-a <value>] [--delivery] [--management] [-e <value>] [-k <value>] [-y] [--token <value>]`

Adds management/delivery tokens to your session to use it with other CLI commands

```
USAGE
  $ csdx tokens:add [-a <value>] [--delivery] [--management] [-e <value>] [-k <value>] [-y] [--token <value>]

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
  $ csdx tokens:add

  $ csdx tokens:add -a <alias>

  $ csdx tokens:add -k <stack api key>

  $ csdx tokens:add --delivery

  $ csdx tokens:add --management

  $ csdx tokens:add -e <environment>

  $ csdx tokens:add --token <token>

  $ csdx tokens:add -a <alias> -k <stack api key> --management --token <management token>

  $ csdx tokens:add -a <alias> -k <stack api key> --delivery -e <environment> --token <delivery token>

  $ csdx tokens:add --alias <alias> --stack-api-key <stack api key> --management --token <management token>

  $ csdx tokens:add --alias <alias> --stack-api-key <stack api key> --delivery -e <environment> --token <delivery token>
```

_See code: [src/commands/tokens/add.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-auth/src/commands/tokens/add.ts)_

## `csdx tokens:list`

Lists all existing tokens added to the session

```
USAGE
  $ csdx tokens:list [--columns <value>] [--sort <value>] [--filter <value>] [--csv] [--no-truncate]
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
  $ csdx tokens:list
```

_See code: [src/commands/tokens/list.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-auth/src/commands/tokens/list.ts)_

## `csdx tokens:remove`

Removes selected tokens

```
USAGE
  $ csdx tokens:remove [-a <value>] [-i]

FLAGS
  -a, --alias=<value>  Alias (name) of the token to delete.
  -i, --ignore         Ignores if the token is not present.

DESCRIPTION
  Removes selected tokens

EXAMPLES
  $ csdx tokens:remove

  $ csdx tokens:remove -a <alias>
```

_See code: [src/commands/tokens/remove.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-auth/src/commands/tokens/remove.ts)_

## `csdx whoami`

Display current users email address

```
USAGE
  $ csdx whoami

DESCRIPTION
  Display current users email address

ALIASES
  $ csdx whoami

EXAMPLES
  $ csdx auth:whoami
```
<!-- commandsstop -->
