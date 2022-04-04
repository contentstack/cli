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
$ npm install -g @contentstack/cli-auth
$ csdx COMMAND
running command...
$ csdx (-v|--version|version)
@contentstack/cli-auth/1.0.0 linux-x64 node-v12.22.7
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

## `csdx auth:login`

User sessions login

```
USAGE
  $ csdx auth:login

OPTIONS
  -p, --password=password  Password
  -u, --username=username  User name

EXAMPLES
  $ csdx auth:login
  $ csdx auth:login -u <username>
  $ csdx auth:login -u <username> -p <password>
```

_See code: [src/commands/auth/login.ts](https://github.com/contentstack/cli/blob/v1.0.0/src/commands/auth/login.ts)_

## `csdx auth:logout`

User session logout

```
USAGE
  $ csdx auth:logout

OPTIONS
  -f, --force  CLI_AUTH_LOGOUT_FLAG_FORCE

EXAMPLES
  $ csdx auth:logout
  $ csdx auth:logout -f
```

_See code: [src/commands/auth/logout.ts](https://github.com/contentstack/cli/blob/v1.0.0/src/commands/auth/logout.ts)_

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

_See code: [src/commands/auth/tokens/index.ts](https://github.com/contentstack/cli/blob/v1.0.0/src/commands/auth/tokens/index.ts)_

## `csdx auth:tokens:add`

Adds management/delivery tokens to your session to use it with further CLI commands

```
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

_See code: [src/commands/auth/tokens/add.ts](https://github.com/contentstack/cli/blob/v1.0.0/src/commands/auth/tokens/add.ts)_

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
  $ csdx auth:tokens:remove -a <aliase>
```

_See code: [src/commands/auth/tokens/remove.ts](https://github.com/contentstack/cli/blob/v1.0.0/src/commands/auth/tokens/remove.ts)_

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

_See code: [src/commands/auth/whoami.ts](https://github.com/contentstack/cli/blob/v1.0.0/src/commands/auth/whoami.ts)_
<!-- commandsstop -->
