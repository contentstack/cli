<!-- Insert Nodejs CI here -->
<!-- Insert Apps CLI version here -->

# @contentstack/cli-audit
Audit plugin

## How to install this plugin

```shell
$ csdx plugins:install @contentstack/cli-audit
```

## How to use this plugin

This plugin requires you to be authenticated using [csdx auth:login](https://www.contentstack.com/docs/developers/cli/authenticate-with-the-cli/).

<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli-audit
$ csdx COMMAND
running command...
$ csdx (--version|-v)
@contentstack/cli-audit/0.0.0-alpha darwin-arm64 node-v16.19.0
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->

# Commands
<!-- commands -->
* [`csdx cm:audit`](#csdx-cmaudit)
* [`csdx cm:audit:fix`](#csdx-cmauditfix)

## `csdx cm:audit`

Audit and find possible errors in the exported data

```
USAGE
  $ csdx cm:audit [-c <value>] [-d <value>]

FLAGS
  -c, --config=<value>    Path of the external config
  -d, --data-dir=<value>  Current working directory.

DESCRIPTION
  Audit and find possible errors in the exported data

ALIASES
  $ csdx cm:audit

EXAMPLES
  $ csdx cm:audit
```

_See code: [src/commands/cm/audit/index.ts](https://github.com/contentstack/audit/blob/main/packages/contentstack-audit/src/commands/cm/audit/index.ts)_

## `csdx cm:audit:fix`

Audit fix command

```
USAGE
  $ csdx cm:audit:fix [-c <value>] [-d <value>]

FLAGS
  -c, --config=<value>    Path of the external config
  -d, --data-dir=<value>  Current working directory.

DESCRIPTION
  Audit fix command

ALIASES
  $ csdx cm:audit:fix

EXAMPLES
  $ csdx cm:audit:fix
```
<!-- commandsstop -->
