@contentstack/cli-migration
===========================

The Contentstack CLI’s “Migration” plugin allows developers to automate the content migration process and easily migrate your content from your system to Contentstack. 


[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@contentstack/cli-migration.svg)](https://npmjs.org/package/@contentstack/cli-migration)
[![Downloads/week](https://img.shields.io/npm/dw/@contentstack/cli-migration.svg)](https://npmjs.org/package/@contentstack/cli-migration)
[![License](https://img.shields.io/npm/l/@contentstack/cli-migration.svg)](https://github.com/ninadhatkar/cli-migration/blob/master/package.json)

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
@contentstack/cli-migration/0.1.1-beta.1 linux-x64 node-v12.22.1
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
  -A, --authtoken                                      Use this flag to use the auth token of the current session. After
                                                       logging in CLI, an auth token is generated for each new session.

  -a, --management-token-alias=management-token-alias  Use this flag to add the management token alias.

  -b, --branch=branch                                  Use this flag to add the branch name where you want to perform
                                                       the migration.

  -k, --api-key=api-key                                With this flag add the API key of your stack.

  -n, --filePath=filePath                              Use this flag to provide the path of the file of the migration
                                                       script provided by the user.

  --multi                                              This flag helps you to migrate multiple content files in a single
                                                       instance.
```

_See code: [src/commands/cm/migration.js](https://github.com/contentstack/cli-migration/blob/v0.1.1-beta.1/src/commands/cm/migration.js)_
<!-- commandsstop -->

### Points to remember

* Currently, the Migration plugin does not support Group fields migration. You can pass a custom schema to the createField method to migrate Group fields. [here](packages/contentstack-migration/examples/)
* Currently, the Migration plugin does not support Global fields migration. You can migrate Global fields by creating an SDK instance and adding it to content types using the createField method.[here](packages/contentstack-migration/examples/)
* Currently, the Migration plugin does not support migration of Entries. You can migrate entries by creating an SDK instance to create/ update/ delete entries for your content type. [here](packages/contentstack-migration/examples/)
