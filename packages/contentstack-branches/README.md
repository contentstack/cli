# @contentstack/cli-cm-branches

It is Contentstack’s CLI plugin to compare and merge content.
[![License](https://img.shields.io/npm/l/@contentstack/cli)](https://github.com/contentstack/cli/blob/main/LICENSE)

<!-- toc -->
* [@contentstack/cli-cm-branches](#contentstackcli-cm-branches)
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
@contentstack/cli-cm-branches/1.5.0 darwin-arm64 node-v22.14.0
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`csdx cm:branches`](#csdx-cmbranches)
* [`csdx cm:branches:create`](#csdx-cmbranchescreate)
* [`csdx cm:branches:delete [-uid <value>] [-k <value>]`](#csdx-cmbranchesdelete--uid-value--k-value)
* [`csdx cm:branches:diff [--base-branch <value>] [--compare-branch <value>] [-k <value>][--module <value>]`](#csdx-cmbranchesdiff---base-branch-value---compare-branch-value--k-value--module-value)
* [`csdx cm:branches:merge [-k <value>][--compare-branch <value>] [--no-revert] [--export-summary-path <value>] [--use-merge-summary <value>] [--comment <value>] [--base-branch <value>]`](#csdx-cmbranchesmerge--k-value--compare-branch-value---no-revert---export-summary-path-value---use-merge-summary-value---comment-value---base-branch-value)

## `csdx cm:branches`

List the branches

```
USAGE
  $ csdx cm:branches

FLAGS
  -k, --stack-api-key=<value>  Stack API key
      --verbose                Verbose, display information in detailed format.

DESCRIPTION
  List the branches

EXAMPLES
  $ csdx cm:branches

  $ csdx cm:branches --verbose

  $ csdx cm:branches -k <stack api key>
```

_See code: [src/commands/cm/branches/index.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/branches/index.ts)_

## `csdx cm:branches:create`

Create a new branch

```
USAGE
  $ csdx cm:branches:create
  $ csdx cm:branches:create [--source <value>] [--uid <value>] [-k <value>]
  $ csdx cm:branches:create [--source <value>] [--uid <value>] [--stack-api-key <value>]

FLAGS
  -k, --stack-api-key=<value>  Stack API key
      --source=<value>         Source branch from which a new branch is to be created.
      --uid=<value>            Branch UID (unique name) to be created.

DESCRIPTION
  Create a new branch

EXAMPLES
  $ csdx cm:branches:create

  $ csdx cm:branches:create --source main -uid new_branch -k bltxxxxxxxx

  $ csdx cm:branches:create --source main --uid new_branch --stack-api-key bltxxxxxxxx
```

_See code: [src/commands/cm/branches/create.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/branches/create.ts)_

## `csdx cm:branches:delete [-uid <value>] [-k <value>]`

Delete a branch

```
USAGE
  $ csdx cm:branches:delete [-uid <value>] [-k <value>]
  $ csdx cm:branches:delete [--uid <value>] [--stack-api-key <value>]

FLAGS
  -k, --stack-api-key=<value>  Stack API key
  -y, --yes                    Force the deletion of the branch by skipping the confirmation
      --uid=<value>            Branch UID to be deleted

DESCRIPTION
  Delete a branch

EXAMPLES
  $ csdx cm:branches:delete

  $ csdx cm:branches:delete --uid main -k bltxxxxxxxx

  $ csdx cm:branches:delete --uid main --stack-api-key bltxxxxxxxx

  $ csdx cm:branches:delete --uid main --stack-api-key bltxxxxxxxx --yes
```

_See code: [src/commands/cm/branches/delete.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/branches/delete.ts)_

## `csdx cm:branches:diff [--base-branch <value>] [--compare-branch <value>] [-k <value>][--module <value>]`

Differences between two branches

```
USAGE
  $ csdx cm:branches:diff [--base-branch <value>] [--compare-branch <value>] [-k <value>][--module <value>]

FLAGS
  -k, --stack-api-key=<value>   [optional] Provide the stack API key to show the difference between branches.
      --base-branch=<value>     [optional] Base branch (Target branch).
      --compare-branch=<value>  [optional] Compare branch (Source branch).
      --format=<option>         [default: compact-text] [default: compact-text] [optional] Type of flags to show the
                                difference between two branches. <options: compact-text, detailed-text>
                                <options: compact-text|detailed-text>
      --module=<option>         [optional] Module. <options: content-types, global-fields, all>
                                <options: content-types|global-fields|all>

DESCRIPTION
  Differences between two branches

EXAMPLES
  $ csdx cm:branches:diff

  $ csdx cm:branches:diff --stack-api-key "bltxxxxxxxx"

  $ csdx cm:branches:diff --compare-branch "develop"

  $ csdx cm:branches:diff --compare-branch "develop" --stack-api-key "bltxxxxxxxx"

  $ csdx cm:branches:diff --compare-branch "develop" --module "content-types"

  $ csdx cm:branches:diff --module "content-types" --format "detailed-text"

  $ csdx cm:branches:diff --compare-branch "develop" --format "detailed-text"

  $ csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main"

  $ csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main" --compare-branch "develop"

  $ csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main" --module "content-types"

  $ csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main" --compare-branch "develop" --module "content-types"

  $ csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main" --compare-branch "develop" --module "content-types" --format "detailed-text"
```

_See code: [src/commands/cm/branches/diff.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/branches/diff.ts)_

## `csdx cm:branches:merge [-k <value>][--compare-branch <value>] [--no-revert] [--export-summary-path <value>] [--use-merge-summary <value>] [--comment <value>] [--base-branch <value>]`

Merge changes from a branch

```
USAGE
  $ csdx cm:branches:merge [-k <value>][--compare-branch <value>] [--no-revert] [--export-summary-path <value>]
    [--use-merge-summary <value>] [--comment <value>] [--base-branch <value>]

FLAGS
  -k, --stack-api-key=<value>        [optional] Provide stack API key to show the difference between the branches.
      --base-branch=<value>          [optional] Base branch (Target branch).
      --comment=<value>              [optional] Pass a comment.
      --compare-branch=<value>       [optional] Compare branch (Source branch).
      --export-summary-path=<value>  [optional] Export summary file path.
      --no-revert                    [optional] If passed, will not create the new revert branch.
      --use-merge-summary=<value>    [optional] Path of merge summary file.

DESCRIPTION
  Merge changes from a branch

EXAMPLES
  $ csdx cm:branches:merge --stack-api-key bltxxxxxxxx --compare-branch feature-branch

  $ csdx cm:branches:merge --stack-api-key bltxxxxxxxx --comment "merge comment"

  $ csdx cm:branches:merge -k bltxxxxxxxx --base-branch base-branch

  $ csdx cm:branches:merge --export-summary-path file/path

  $ csdx cm:branches:merge --use-merge-summary file-path

  $ csdx cm:branches:merge -k bltxxxxxxxx --no-revert

  $ csdx cm:branches:merge -k bltxxxxxxxx --compare-branch feature-branch --no-revert
```

_See code: [src/commands/cm/branches/merge.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/branches/merge.ts)_
<!-- commandsstop -->
