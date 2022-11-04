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
$ csdx (-v|--version|version)
@contentstack/cli-auth/1.0.2 darwin-x64 node-v16.18.0
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
* [`csdx auth:tokens:remove`](#csdx-authtokensremove)
* [`csdx auth:whoami`](#csdx-authwhoami)

## `csdx auth:login`

User sessions login

```
USAGE
  $ csdx auth:login

OPTIONS
  -p, --password=password  Password
  -u, --username=username  User name

ALIASES
  $ csdx login

EXAMPLES
  $ csdx auth:login
  $ csdx auth:login -u <username>
  $ csdx auth:login -u <username> -p <password>
  $ csdx auth:login --username <username>
  $ csdx auth:login --username <username> --password <password>
```

_See code: [src/commands/auth/login.ts](https://github.com/contentstack/cli/blob/v1.0.2/src/commands/auth/login.ts)_

## `csdx auth:logout`

User session logout

```
USAGE
  $ csdx auth:logout

OPTIONS
  -y, --yes  Force log out by skipping the confirmation

ALIASES
  $ csdx logout

EXAMPLES
  $ csdx auth:logout
  $ csdx auth:logout -y
  $ csdx auth:logout --yes
```

_See code: [src/commands/auth/logout.ts](https://github.com/contentstack/cli/blob/v1.0.2/src/commands/auth/logout.ts)_

## `csdx auth:tokens`

Lists all existing tokens added to the session

```
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

_See code: [src/commands/auth/tokens/index.ts](https://github.com/contentstack/cli/blob/v1.0.2/src/commands/auth/tokens/index.ts)_

## `csdx auth:tokens:add [-a <value>] [--delivery] [--management] [-e <value>] [-k <value>] [-y] [--token <value>]`

Adds management/delivery tokens to your session to use it with other CLI commands

```
USAGE
  $ csdx auth:tokens:add [-a <value>] [--delivery] [--management] [-e <value>] [-k <value>] [-y] [--token <value>]

OPTIONS
  -a, --alias=alias                  Name of the token alias
  -d, --delivery                     Set this flag to save delivery token
  -e, --environment=environment      Environment name for delivery token
  -k, --stack-api-key=stack-api-key  Stack API Key
  -m, --management                   Set this flag to save management token
  -t, --token=token                  Add the token name
  -y, --yes                          Use this flag to skip confirmation

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
  $ csdx auth:tokens:add --alias <alias> --stack-api-key <stack api key> --delivery -e <environment> --token <delivery 
  token>
```

_See code: [src/commands/auth/tokens/add.ts](https://github.com/contentstack/cli/blob/v1.0.2/src/commands/auth/tokens/add.ts)_

## `csdx auth:tokens:remove`

Removes selected tokens

```
USAGE
  $ csdx auth:tokens:remove

OPTIONS
  -a, --alias=alias  Token alias
  -i, --ignore       Ignore

EXAMPLES
  $ csdx auth:tokens:remove
  $ csdx auth:tokens:remove -a <alias>
```

_See code: [src/commands/auth/tokens/remove.ts](https://github.com/contentstack/cli/blob/v1.0.2/src/commands/auth/tokens/remove.ts)_

## `csdx auth:whoami`

Display current users email address

```
USAGE
  $ csdx auth:whoami

ALIASES
  $ csdx whoami

EXAMPLE
  $ csdx auth:whoami
```

_See code: [src/commands/auth/whoami.ts](https://github.com/contentstack/cli/blob/v1.0.2/src/commands/auth/whoami.ts)_
<!-- commandsstop -->
