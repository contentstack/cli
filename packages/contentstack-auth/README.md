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
@contentstack/cli-auth/0.1.1-beta.1 darwin-x64 node-v13.14.0
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

Login to Contentstack and save the session for further use

```
Login to Contentstack and save the session for further use

USAGE
  $ csdx auth:login

OPTIONS
  -u, --username=username  Email address of your Contentstack account

ALIASES
  $ csdx login
```

_See code: [src/commands/auth/login.js](https://github.com/contentstack/cli/blob/v0.1.1-beta.1/packages/auth/src/commands/auth/login.js)_

## `csdx auth:logout`

Log out from Contentstack and clear the session

```
Log out from Contentstack and clear the session

USAGE
  $ csdx auth:logout

OPTIONS
  -f, --force  Exclude confirmation to logout

ALIASES
  $ csdx logout
```

_See code: [src/commands/auth/logout.js](https://github.com/contentstack/cli/blob/v0.1.1-beta.1/packages/auth/src/commands/auth/logout.js)_

## `csdx auth:tokens`

Lists all existing tokens added to the session

```
Lists all existing tokens added to the session 


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
```

_See code: [src/commands/auth/tokens/index.js](https://github.com/contentstack/cli/blob/v0.1.1-beta.1/packages/auth/src/commands/auth/tokens/index.js)_

## `csdx auth:tokens:add`

Adds management/delivery tokens to your session to use it with further CLI command

```
Adds management/delivery tokens to your session to use it with further CLI command
by default it adds management token if either of management or delivery flags are not set

USAGE
  $ csdx auth:tokens:add

OPTIONS
  -a, --alias=alias
  -d, --delivery                 Set this while saving delivery token
  -e, --environment=environment  Environment name for delivery token
  -f, --force                    Exclude confirmation to replace existing alias
  -k, --api-key=api-key          Stack API key for the token
  -m, --management               Set this while saving management token

  -t, --token=token              Sets token. Can be set via environment variable 'TOKEN'. We recommend to use env
                                 variable

DESCRIPTION
  by default it adds management token if either of management or delivery flags are not set

ALIASES
  $ csdx tokens:add
```

_See code: [src/commands/auth/tokens/add.js](https://github.com/contentstack/cli/blob/v0.1.1-beta.1/packages/auth/src/commands/auth/tokens/add.js)_

## `csdx auth:tokens:remove`

Removes stored tokens

```
Removes stored tokens

USAGE
  $ csdx auth:tokens:remove

OPTIONS
  -a, --alias=alias  Alias (name) of the token to remove

  -i, --ignore       Ignores if token not present. Command shows show list of available aliases with multi select option
                     to delete tokens from that list.

ALIASES
  $ csdx tokens:remove
```

_See code: [src/commands/auth/tokens/remove.js](https://github.com/contentstack/cli/blob/v0.1.1-beta.1/packages/auth/src/commands/auth/tokens/remove.js)_

## `csdx auth:whoami`

Display current users email address

```
Display current users email address


USAGE
  $ csdx auth:whoami

ALIASES
  $ csdx whoami
```

_See code: [src/commands/auth/whoami.js](https://github.com/contentstack/cli/blob/v0.1.1-beta.1/packages/auth/src/commands/auth/whoami.js)_
<!-- commandsstop -->
