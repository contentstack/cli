# @contentstack/cli-migration

The Contentstack CLI’s “Migration” plugin allows developers to automate the content migration process and easily migrate your content from your system to Contentstack.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@contentstack/cli-migration.svg)](https://npmjs.org/package/@contentstack/cli-migration)
[![Downloads/week](https://img.shields.io/npm/dw/@contentstack/cli-migration.svg)](https://npmjs.org/package/@contentstack/cli-migration)
[![License](https://img.shields.io/npm/l/@contentstack/cli-migration.svg)](https://github.com/***REMOVED***/cli-migration/blob/master/package.json)

<!-- toc -->

- [@contentstack/cli-migration](#contentstackcli-migration)
- [Usage](#usage)
- [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g @contentstack/cli-migration
$ csdx COMMAND
running command...
$ csdx (-v|--version|version)
@contentstack/cli-migration/1.0.2 darwin-arm64 node-v18.11.0
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`csdx cm:stacks:migration [-k <value>] [-a <value>] [--file-path <value>] [--branch <value>] [--config-file <value>] [--config <value>] [--multiple]`](#csdx-cmstacksmigration--k-value--a-value---file-path-value---branch-value---config-file-value---config-value---multiple)

## `csdx cm:stacks:migration [-k <value>] [-a <value>] [--file-path <value>] [--branch <value>] [--config-file <value>] [--config <value>] [--multiple]`

Contentstack migration script.

```
USAGE
  $ csdx cm:stacks:migration [-k <value>] [-a <value>] [--file-path <value>] [--branch <value>] [--config-file <value>]
  [--config <value>] [--multiple]

OPTIONS
  -B, --branch=branch                Use this flag to add the branch name where you want to perform the migration.
  -a, --alias=alias                  Use this flag to add the management token alias.
  -k, --stack-api-key=stack-api-key  With this flag add the API key of your stack.
  --config=config                    [optional] inline configuration, <key1>:<value1>
  --config-file=config-file          [optional] Path of the JSON configuration file

  --file-path=file-path              Use this flag to provide the path of the file of the migration script provided by
                                     the user.

  --multiple                         This flag helps you to migrate multiple content files in a single instance.

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

<!-- commandsstop -->

### Points to remember

- Currently, you can pass a custom schema to the createField method to migrate group fields.
- You can migrate global fields by creating an SDK instance and adding it to content types using the createField method.
- Currently, you can migrate entries by creating an SDK instance to create/update/delete entries for your content type.
