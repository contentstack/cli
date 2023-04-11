# @contentstack/cli-cm-export

It is Contentstack’s CLI plugin to export content from the stack. To learn how to export and import content in Contentstack, refer to the [Migration guide](https://www.contentstack.com/docs/developers/cli/migration/).

[![License](https://img.shields.io/npm/l/@contentstack/cli)](https://github.com/contentstack/cli/blob/main/LICENSE)

<!-- toc -->

- [@contentstack/cli-cm-export](#contentstackcli-cm-export)
- [Usage](#usage)
- [Commands](#commands)
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
@contentstack/cli-cm-branches/1.0.0 darwin-arm64 node-v16.17.1
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`csdx cm:branches`](#csdx-cmbranches)
- [`csdx cm:branches:config --global [--base-branch <value>] [--stack-api-key <value>]`](#csdx-cmbranchesconfig---global---base-branch-value---stack-api-key-value)
- [`csdx cm:branches:create`](#csdx-cmbranchescreate)
- [`csdx cm:branches:delete [-u <value>] [-k <value>]`](#csdx-cmbranchesdelete--u-value--k-value)
- [`csdx cm:branches:diff [-c <value>] [-k <value>][-m <value>]`](#csdx-cmbranchesdiff--c-value--k-value-m-value)
- [`csdx cm:branches:merge [--compare-branch <value>] [--module <value>]`](#csdx-cmbranchesmerge---compare-branch-value---module-value)

## `csdx cm:branches`

List the branches

```
USAGE
  $ csdx cm:branches

FLAGS
  -k, --stack-api-key=<value>  Stack API Key
  -v, --verbose                Verbose

DESCRIPTION
  List the branches

EXAMPLES
  $ csdx cm:branches

  $ csdx cm:branches --verbose

  $ csdx cm:branches -k <stack api key>
```

_See code: [src/commands/cm/branches/index.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/branches/index.ts)_

## `csdx cm:branches:config --global [--base-branch <value>] [--stack-api-key <value>]`

Set the branch

```
USAGE
  $ csdx cm:branches:config --global [--base-branch <value>] [--stack-api-key <value>]

FLAGS
  -b, --base-branch=<value>    [default: main] Base Branch
  -g, --global                 global configuration
  -k, --stack-api-key=<value>  (required) Stack API Key

DESCRIPTION
  Set the branch

EXAMPLES
  $ csdx cm:branches:config -k <stack api key> --base-branch <base branch>

  $ csdx cm:branches:config --global -k <stack api key> --base-branch <base branch>

  $ csdx cm:branches:config --global -k <stack api key>
```

_See code: [src/commands/cm/branches/config.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/branches/config.ts)_

## `csdx cm:branches:create`

Create a new branch

```
USAGE
  $ csdx cm:branches:create
  $ csdx cm:branches:create [-s <value>] [-u <value>] [-k <value>]
  $ csdx cm:branches:create [--source <value>] [--uid <value>] [--stack-api-key <value>]

FLAGS
  -k, --stack-api-key=<value>  Stack API key
  -s, --source=<value>         Source branch from which new branch to be created
  -u, --uid=<value>            Branch Uid to be created

DESCRIPTION
  Create a new branch

EXAMPLES
  $ csdx cm:branches

  $ csdx cm:branches:create

  $ csdx cm:branches:create -s main -u new_branch -k bltxxxxxxxx

  $ csdx cm:branches:create --source main --uid new_branch --stack-api-key bltxxxxxxxx
```

_See code: [src/commands/cm/branches/create.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/branches/create.ts)_

## `csdx cm:branches:delete [-u <value>] [-k <value>]`

Delete a branch

```
USAGE
  $ csdx cm:branches:delete [-u <value>] [-k <value>]
  $ csdx cm:branches:delete [--uid <value>] [--stack-api-key <value>]

FLAGS
  -f, --force
  -k, --stack-api-key=<value>  Stack API key
  -u, --uid=<value>            UID of the branch to be deleted
  -y, --confirm                Are you sure you want to delete

DESCRIPTION
  Delete a branch

EXAMPLES
  $ csdx cm:branches:delete

  $ csdx cm:branches:delete -u main -k bltxxxxxxxx

  $ csdx cm:branches:delete --uid main --stack-api-key bltxxxxxxxx
```

_See code: [src/commands/cm/branches/delete.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/branches/delete.ts)_

## `csdx cm:branches:diff [-c <value>] [-k <value>][-m <value>]`

Differences between two branches

```
USAGE
  $ csdx cm:branches:diff [-c <value>] [-k <value>][-m <value>]

FLAGS
  -b, --base-branch=<value>     Base branch
  -c, --compare-branch=<value>  Compare branch
  -k, --stack-api-key=<value>   Provide stack api key to show diff between branches
  -m, --module=<option>         Module
                                <options: content_types|global_fields|both>
  --filter=<value>              [Optional] Provide filter to show particular uid like conntent_type uid etc.
  --format=<option>             [default: text] [Optional] Type of flags to show branches difference view
                                <options: text|verbose>

DESCRIPTION
  Differences between two branches

EXAMPLES
  $ csdx cm:branches:diff

  $ csdx cm:branches:diff --stack-api-key "bltxxxxxxxx"

  $ csdx cm:branches:diff --compare-branch "develop"

  $ csdx cm:branches:diff --compare-branch "develop" --stack-api-key "bltxxxxxxxx"

  $ csdx cm:branches:diff --compare-branch "develop" --module "content-types"

  $ csdx cm:branches:diff --module "content-types" --format "verbose"

  $ csdx cm:branches:diff --compare-branch "develop" --format "verbose"

  $ csdx cm:branches:diff --compare-branch "develop" --module "content-types" --filter "{content_type: "uid"}"

  $ csdx cm:branches:diff --compare-branch "develop" --module "content-types" --format "verbose" --filter "{content_type: "uid"}"
```

_See code: [src/commands/cm/branches/diff.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/branches/diff.ts)_

## `csdx cm:branches:merge [--compare-branch <value>] [--module <value>]`

Merge changes from a branch

```
USAGE
  $ csdx cm:branches:merge [--compare-branch <value>] [--module <value>]

FLAGS
  --compare-branch=<value>  (required) Compare branch name
  --merge-comment=<value>   Merge comment

DESCRIPTION
  Merge changes from a branch

EXAMPLES
  $ csdx cm:branches:merge --compare-branch feature-branch --module=content-types

  $ csdx cm:branches:merge --compare-branch feature-branch --module=global-fields

  $ csdx cm:branches:merge --compare-branch feature-branch
```

_See code: [src/commands/cm/branches/merge.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/branches/merge.ts)_

<!-- commandsstop -->
