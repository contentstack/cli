# @contentstack/cli-cm-export

It is Contentstack’s CLI plugin to export content from the stack. To learn how to export and import content in Contentstack, refer to the [Migration guide](https://www.contentstack.com/docs/developers/cli/migration/).

[![License](https://img.shields.io/npm/l/@contentstack/cli)](https://github.com/contentstack/cli/blob/main/LICENSE)

<!-- toc -->
* [@contentstack/cli-cm-export](#contentstackcli-cm-export)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

For switching to EU region update the hosts at config/default.js

```js
{
  host:'https://eu-api.contentstack.com/v3',
  cdn: 'https://eu-cdn.contentstack.com/v3',
 ...
}
```

For switching to AZURE-NA region update the hosts at config/default.js

```js
{
  host:'https://azure-na-api.contentstack.com/v3',
  cdn: 'https://azure-na-cdn.contentstack.com/v3',
 ...
}
```

# Usage

<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli-cm-branches
$ csdx COMMAND
running command...
$ csdx (--version)
@contentstack/cli-cm-branches/1.0.0 darwin-arm64 node-v18.11.0
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`csdx cm:branches [--base-branch <value>] [--stack-api-key <value>]`](#csdx-cmbranches---base-branch-value---stack-api-key-value)
* [`csdx cm:branches:config [--base-branch <value>] [--stack-api-key <value>]`](#csdx-cmbranchesconfig---base-branch-value---stack-api-key-value)
* [`csdx cm:branches:create [--base-branch <value>] [--stack-api-key <value>]`](#csdx-cmbranchescreate---base-branch-value---stack-api-key-value)
* [`csdx cm:branches:delete [--base-branch <value>] [--stack-api-key <value>]`](#csdx-cmbranchesdelete---base-branch-value---stack-api-key-value)
* [`csdx cm:branches:diff [--base-branch <value>] [--stack-api-key <value>]`](#csdx-cmbranchesdiff---base-branch-value---stack-api-key-value)
* [`csdx cm:branches:merge [--base-branch <value>] [--stack-api-key <value>]`](#csdx-cmbranchesmerge---base-branch-value---stack-api-key-value)

## `csdx cm:branches [--base-branch <value>] [--stack-api-key <value>]`

List the branches to select

```
USAGE
  $ csdx cm:branches [--base-branch <value>] [--stack-api-key <value>]

DESCRIPTION
  List the branches to select

EXAMPLES
  $ csdx cm:branches --base-branch main --stack-api-key bltxxxxxxxx
```

_See code: [src/commands/cm/branches/index.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/branches/index.ts)_

## `csdx cm:branches:config [--base-branch <value>] [--stack-api-key <value>]`

Set the branch

```
USAGE
  $ csdx cm:branches:config [--base-branch <value>] [--stack-api-key <value>]

DESCRIPTION
  Set the branch

EXAMPLES
  $ csdx cm:branches:config --base-branch main --stack-api-key bltxxxxxxxx
```

_See code: [src/commands/cm/branches/config.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/branches/config.ts)_

## `csdx cm:branches:create [--base-branch <value>] [--stack-api-key <value>]`

Create a new branch

```
USAGE
  $ csdx cm:branches:create [--base-branch <value>] [--stack-api-key <value>]

DESCRIPTION
  Create a new branch

EXAMPLES
  $ csdx cm:branches:create --base-branch main --stack-api-key bltxxxxxxxx
```

_See code: [src/commands/cm/branches/create.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/branches/create.ts)_

## `csdx cm:branches:delete [--base-branch <value>] [--stack-api-key <value>]`

Delete a branch

```
USAGE
  $ csdx cm:branches:delete [--base-branch <value>] [--stack-api-key <value>]

DESCRIPTION
  Delete a branch

EXAMPLES
  $ csdx cm:branches:delete --base-branch main --stack-api-key bltxxxxxxxx
```

_See code: [src/commands/cm/branches/delete.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/branches/delete.ts)_

## `csdx cm:branches:diff [--base-branch <value>] [--stack-api-key <value>]`

Check the difference between the branches

```
USAGE
  $ csdx cm:branches:diff [--base-branch <value>] [--stack-api-key <value>]

DESCRIPTION
  Check the difference between the branches

EXAMPLES
  $ csdx cm:branches:diff --base-branch main --stack-api-key bltxxxxxxxx
```

_See code: [src/commands/cm/branches/diff.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/branches/diff.ts)_

## `csdx cm:branches:merge [--base-branch <value>] [--stack-api-key <value>]`

Merge a branch

```
USAGE
  $ csdx cm:branches:merge [--base-branch <value>] [--stack-api-key <value>]

DESCRIPTION
  Merge a branch

EXAMPLES
  $ csdx cm:branches:merge --base-branch main --stack-api-key bltxxxxxxxx
```

_See code: [src/commands/cm/branches/merge.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/branches/merge.ts)_
<!-- commandsstop -->
