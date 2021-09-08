@contentstack/cli-migration
===========================

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@contentstack/cli-migration.svg)](https://npmjs.org/package/@contentstack/cli-migration)
[![Downloads/week](https://img.shields.io/npm/dw/@contentstack/cli-migration.svg)](https://npmjs.org/package/@contentstack/cli-migration)
[![License](https://img.shields.io/npm/l/@contentstack/cli-migration.svg)](https://github.com/***REMOVED***/cli-migration/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli-migration
$ csdx COMMAND
running command...
$ csdx (-v|--version|version)
@contentstack/cli-migration/0.0.0 darwin-x64 node-v13.14.0
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`csdx cm:migration`](#csdx-cmmigration)

## `csdx cm:migration`

Contentstack migration script.

```
Contentstack migration script.

USAGE
  $ csdx cm:migration

OPTIONS
  -A, --authtoken                                      Use authtoken
  -a, --management-token-alias=management-token-alias  Alias to be used
  -b, --branch=branch                                  Branch name
  -k, --api-key=api-key                                Api key along with authtoken to be used
  -n, --filePath=filePath                              Provides filepath to migration script provided by user.
  --multi                                              Supports multiple files
```

_See code: [src/commands/cm/migration.js](https://github.com/contentstack/cli-migration/blob/v0.0.0/src/commands/cm/migration.js)_
<!-- commandsstop -->

### Limitation & work around

* Support for group is not present - Work around would be pass custom schema for now to [createField](packages/contentstack-migration/docs/api-reference.md#fieldcreatefieldfield-opts--field) method. See example [here](packages/contentstack-migration/test/setup/examples/create-ct/create-ct-chaining.js)
* Support for global filed in not present - You can use SDK instance to create global filed and add it to content type via createField method. See example [here](packages/contentstack-migration/test/setup/examples/create-ct/create-ct-chaining.js)
* Support for entries not present - You can use SDK instance to create/update/delete entries for content type. See example [here](packages/contentstack-migration/test/setup/examples/create-ct/create-ct-chaining.js)
