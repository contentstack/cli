@contentstack/cli-cm-export-to-csv
=============

The cm:export-to-csv command allows you to export the following data into a CSV file:
* Multiple stack’s content and structure (schema)
* [Organization users’ details](https://www.contentstack.com/docs/owners-and-admins/organization-users/)

To be able to export the content of a stack, you need to have access to it. Likewise, to export an organization’s user data, you need to be the  “[owner](https://www.contentstack.com/docs/owners-and-admins/organization-roles/#organization-owner)” or an “[admin](https://www.contentstack.com/docs/owners-and-admins/organization-roles/#organization-admin)” user of that organization.

Refer to the [Export Content to .CSV](https://www.contentstack.com/docs/developers/cli/export-content-to-csv-file/) file guide to learn more.

[![License](https://img.shields.io/npm/l/@contentstack/cli)](https://github.com/contentstack/cli/blob/main/LICENSE)

* [Usage](#usage)
* [Commands](#commands)
# Usage
```sh-session
$ npm install -g @contentstack/cli-cm-export-to-csv
$ csdx COMMAND
running command...
$ csdx (-v|--version|version)
@contentstack/cli-cm-export-to-csv/0.1.0-beta linux-x64 node-v12.18.4
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
# Commands
* [`csdx cm:export-to-csv`](#csdx-cmexport-to-csv)

### `csdx cm:export-to-csv`

Export entries or organization users to csv using this command

```
USAGE
  $ csdx cm:export-to-csv
```

_See code: [src/commands/cm/export-to-csv.js](https://github.com/contentstack/cli/blob/main/packages/contentstack-export-to-csv/src/commands/cm/export-to-csv.js)_
