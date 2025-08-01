# @contentstack/cli-migration

The Contentstack CLI’s “Migration” plugin allows developers to automate the content migration process and easily migrate your content from your system to Contentstack.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@contentstack/cli-migration.svg)](https://npmjs.org/package/@contentstack/cli-migration)
[![Downloads/week](https://img.shields.io/npm/dw/@contentstack/cli-migration.svg)](https://npmjs.org/package/@contentstack/cli-migration)
[![License](https://img.shields.io/npm/l/@contentstack/cli-migration.svg)](https://github.com/***REMOVED***/cli-migration/blob/master/package.json)

<!-- toc -->
* [@contentstack/cli-migration](#contentstackcli-migration)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli-migration
$ csdx COMMAND
running command...
$ csdx (--version)
@contentstack/cli-migration/1.8.0 darwin-arm64 node-v18.20.2
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`csdx cm:stacks:migration [-k <value>] [-a <value>] [--file-path <value>] [--branch <value>] [--config-file <value>] [--config <value>] [--multiple]`](#csdx-cmstacksmigration--k-value--a-value---file-path-value---branch-value---config-file-value---config-value---multiple)
* [`csdx cm:stacks:migration [-k <value>] [-a <value>] [--file-path <value>] [--branch <value>] [--config-file <value>] [--config <value>] [--multiple]`](#csdx-cmstacksmigration--k-value--a-value---file-path-value---branch-value---config-file-value---config-value---multiple)

## `csdx cm:stacks:migration [-k <value>] [-a <value>] [--file-path <value>] [--branch <value>] [--config-file <value>] [--config <value>] [--multiple]`

Contentstack migration script.

```
USAGE
  $ csdx cm:migration cm:stacks:migration [-k <value>] [-a <value>] [--file-path <value>] [--branch <value>]
    [--config-file <value>] [--config <value>] [--multiple]

FLAGS
  -B, --branch=<value>         Use this flag to add the branch name where you want to perform the migration. (target
                               branch name)
  -a, --alias=<value>          Use this flag to add the management token alias. You must use either the --alias flag or
                               the --stack-api-key flag.
  -k, --stack-api-key=<value>  Use this flag to add the API key of your stack. You must use either the --stack-api-key
                               flag or the --alias flag.
      --config=<value>...      [optional] Inline configuration, <key1>:<value1>. Passing an external configuration makes
                               the script re-usable.
      --config-file=<value>    [optional] Path of the JSON configuration file.
      --file-path=<value>      Use this flag to provide the path of the file of the migration script.
      --multiple               This flag helps you to migrate multiple content files in a single instance. Mention the
                               folder path where your migration script files are stored.

DESCRIPTION
  Contentstack migration script.

ALIASES
  $ csdx cm:migration

EXAMPLES
  $ csdx cm:migration --file-path <migration/script/file/path> -k <api-key>

  $ csdx cm:migration --file-path <migration/script/file/path> -k <api-key> --branch <target branch name>

  $ csdx cm:migration --config <key1>:<value1> <key2>:<value2> ... --file-path <migration/script/file/path>

  $ csdx cm:migration --config-file <path/to/json/config/file> --file-path <migration/script/file/path>

  $ csdx cm:migration --multiple --file-path <migration/scripts/dir/path> 

  $ csdx cm:migration --alias --file-path <migration/script/file/path> -k <api-key>
```

## `csdx cm:stacks:migration [-k <value>] [-a <value>] [--file-path <value>] [--branch <value>] [--config-file <value>] [--config <value>] [--multiple]`

Contentstack migration script.

```
USAGE
  $ csdx cm:stacks:migration [-k <value>] [-a <value>] [--file-path <value>] [--branch <value>] [--config-file <value>]
    [--config <value>] [--multiple]

FLAGS
  -B, --branch=<value>         Use this flag to add the branch name where you want to perform the migration. (target
                               branch name)
  -a, --alias=<value>          Use this flag to add the management token alias. You must use either the --alias flag or
                               the --stack-api-key flag.
  -k, --stack-api-key=<value>  Use this flag to add the API key of your stack. You must use either the --stack-api-key
                               flag or the --alias flag.
      --config=<value>...      [optional] Inline configuration, <key1>:<value1>. Passing an external configuration makes
                               the script re-usable.
      --config-file=<value>    [optional] Path of the JSON configuration file.
      --file-path=<value>      Use this flag to provide the path of the file of the migration script.
      --multiple               This flag helps you to migrate multiple content files in a single instance. Mention the
                               folder path where your migration script files are stored.

DESCRIPTION
  Contentstack migration script.

ALIASES
  $ csdx cm:migration

EXAMPLES
  $ csdx cm:migration --file-path <migration/script/file/path> -k <api-key>

  $ csdx cm:migration --file-path <migration/script/file/path> -k <api-key> --branch <target branch name>

  $ csdx cm:migration --config <key1>:<value1> <key2>:<value2> ... --file-path <migration/script/file/path>

  $ csdx cm:migration --config-file <path/to/json/config/file> --file-path <migration/script/file/path>

  $ csdx cm:migration --multiple --file-path <migration/scripts/dir/path> 

  $ csdx cm:migration --alias --file-path <migration/script/file/path> -k <api-key>
```

_See code: [src/commands/cm/stacks/migration.js](https://github.com/contentstack/cli/blob/main/packages/contentstack-migration/src/commands/cm/stacks/migration.js)_
<!-- commandsstop -->

### Points to remember

- Currently, you can pass a custom schema to the createField method to migrate group fields.
- You can migrate global fields by creating an SDK instance and adding it to content types using the createField method.
- Currently, you can migrate entries by creating an SDK instance to create/update/delete entries for your content type.
