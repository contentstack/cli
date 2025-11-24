<!-- Insert Nodejs CI here -->
<!-- Insert Audit version here -->

# @contentstack/cli-audit

Audit plugin

## How to install this plugin

```shell
$ csdx plugins:install @contentstack/cli-audit
```

## How to use this plugin

<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli-audit
$ csdx COMMAND
running command...
$ csdx (--version|-v)
@contentstack/cli-audit/1.16.0 darwin-arm64 node-v24.11.1
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`csdx audit`](#csdx-audit)
* [`csdx audit:fix`](#csdx-auditfix)
* [`csdx cm:stacks:audit`](#csdx-cmstacksaudit)
* [`csdx cm:stacks:audit:fix`](#csdx-cmstacksauditfix)
* [`csdx help [COMMAND]`](#csdx-help-command)

## `csdx audit`

Perform audits and find possible errors in the exported Contentstack data

```
USAGE
  $ csdx audit [-c <value>] [-d <value>] [--show-console-output] [--report-path <value>] [--modules
    content-types|global-fields|entries|extensions|workflows|custom-roles|assets|field-rules...] [--columns <value>]
    [--sort <value>] [--filter <value>] [--csv] [--no-truncate] [--no-header] [--output csv|json|yaml]

FLAGS
  --modules=<option>...  Provide the list of modules to be audited
                         <options:
                         content-types|global-fields|entries|extensions|workflows|custom-roles|assets|field-rules>
  --report-path=<value>  Path to store the audit reports

COMMON FLAGS
  -c, --config=<value>       Path of the external config
  -d, --data-dir=<value>     Path where the data is stored
      --show-console-output  Display the audit and audit fix result for individual modules

TABLE FLAGS
  --columns=<value>  Specify columns to display, comma-separated.
  --csv              Output results in CSV format.
  --filter=<value>   Filter rows by a column value (e.g., name=foo).
  --no-header        Hide table headers in output.
  --no-truncate      Prevent truncation of long text in columns.
  --output=<option>  Specify output format: csv, json, or yaml.
                     <options: csv|json|yaml>
  --sort=<value>     Sort the table by a column. Use "-" for descending.

DESCRIPTION
  Perform audits and find possible errors in the exported Contentstack data

ALIASES
  $ csdx audit
  $ csdx cm:stacks:audit

EXAMPLES
  $ csdx audit

  $ csdx audit --report-path=<path>

  $ csdx audit --report-path=<path> --csv

  $ csdx audit --report-path=<path> --filter="name=<filter-value>"

  $ csdx audit --report-path=<path> --modules=content-types --filter="name="<filter-value>"
```

## `csdx audit:fix`

Perform audits and fix possible errors in the exported Contentstack data.

```
USAGE
  $ csdx audit:fix [-c <value>] [-d <value>] [--show-console-output] [--report-path <value>] [--modules
    content-types|global-fields|entries|extensions|workflows|custom-roles|assets|field-rules...] [--copy-path <value>
    --copy-dir] [--fix-only reference|global_field|json:rte|json:extension|blocks|group|content_types...] [--columns
    <value>] [--sort <value>] [--filter <value>] [--csv] [--no-truncate] [--no-header] [--output csv|json|yaml]

FLAGS
  --copy-dir              Create backup from the original data.
  --copy-path=<value>     Provide the path to backup the copied data
  --fix-only=<option>...  Provide the list of fix options
                          <options: reference|global_field|json:rte|json:extension|blocks|group|content_types>
  --modules=<option>...   Provide the list of modules to be audited
                          <options:
                          content-types|global-fields|entries|extensions|workflows|custom-roles|assets|field-rules>
  --report-path=<value>   Path to store the audit reports

COMMON FLAGS
  -c, --config=<value>       Path of the external config
  -d, --data-dir=<value>     Path where the data is stored
      --show-console-output  Display the audit and audit fix result for individual modules

TABLE FLAGS
  --columns=<value>  Specify columns to display, comma-separated.
  --csv              Output results in CSV format.
  --filter=<value>   Filter rows by a column value (e.g., name=foo).
  --no-header        Hide table headers in output.
  --no-truncate      Prevent truncation of long text in columns.
  --output=<option>  Specify output format: csv, json, or yaml.
                     <options: csv|json|yaml>
  --sort=<value>     Sort the table by a column. Use "-" for descending.

DESCRIPTION
  Perform audits and fix possible errors in the exported Contentstack data.

ALIASES
  $ csdx audit:fix
  $ csdx cm:stacks:audit:fix

EXAMPLES
  $ csdx audit:fix --copy-dir

  $ csdx audit:fix --report-path=<path> --copy-dir

  $ csdx audit:fix --report-path=<path> --copy-dir --csv

  $ csdx audit:fix --fix-only=reference,global_field --copy-dir

  $ csdx audit:fix --report-path=<path> --filter="name=<filter-value>"

  $ csdx audit:fix --report-path=<path> --modules=content-types --filter="name="<filter-value>" --copy-dir --copy-path=<path>
```

## `csdx cm:stacks:audit`

Perform audits and find possible errors in the exported Contentstack data

```
USAGE
  $ csdx cm:stacks:audit [-c <value>] [-d <value>] [--show-console-output] [--report-path <value>] [--modules
    content-types|global-fields|entries|extensions|workflows|custom-roles|assets|field-rules...] [--columns <value>]
    [--sort <value>] [--filter <value>] [--csv] [--no-truncate] [--no-header] [--output csv|json|yaml]

FLAGS
  --modules=<option>...  Provide the list of modules to be audited
                         <options:
                         content-types|global-fields|entries|extensions|workflows|custom-roles|assets|field-rules>
  --report-path=<value>  Path to store the audit reports

COMMON FLAGS
  -c, --config=<value>       Path of the external config
  -d, --data-dir=<value>     Path where the data is stored
      --show-console-output  Display the audit and audit fix result for individual modules

TABLE FLAGS
  --columns=<value>  Specify columns to display, comma-separated.
  --csv              Output results in CSV format.
  --filter=<value>   Filter rows by a column value (e.g., name=foo).
  --no-header        Hide table headers in output.
  --no-truncate      Prevent truncation of long text in columns.
  --output=<option>  Specify output format: csv, json, or yaml.
                     <options: csv|json|yaml>
  --sort=<value>     Sort the table by a column. Use "-" for descending.

DESCRIPTION
  Perform audits and find possible errors in the exported Contentstack data

ALIASES
  $ csdx audit
  $ csdx cm:stacks:audit

EXAMPLES
  $ csdx cm:stacks:audit

  $ csdx cm:stacks:audit --report-path=<path>

  $ csdx cm:stacks:audit --report-path=<path> --csv

  $ csdx cm:stacks:audit --report-path=<path> --filter="name=<filter-value>"

  $ csdx cm:stacks:audit --report-path=<path> --modules=content-types --filter="name="<filter-value>"
```

_See code: [src/commands/cm/stacks/audit/index.ts](https://github.com/contentstack/audit/blob/main/packages/contentstack-audit/src/commands/cm/stacks/audit/index.ts)_

## `csdx cm:stacks:audit:fix`

Perform audits and fix possible errors in the exported Contentstack data.

```
USAGE
  $ csdx cm:stacks:audit:fix [-c <value>] [-d <value>] [--show-console-output] [--report-path <value>] [--modules
    content-types|global-fields|entries|extensions|workflows|custom-roles|assets|field-rules...] [--copy-path <value>
    --copy-dir] [--fix-only reference|global_field|json:rte|json:extension|blocks|group|content_types...] [--columns
    <value>] [--sort <value>] [--filter <value>] [--csv] [--no-truncate] [--no-header] [--output csv|json|yaml]

FLAGS
  --copy-dir              Create backup from the original data.
  --copy-path=<value>     Provide the path to backup the copied data
  --fix-only=<option>...  Provide the list of fix options
                          <options: reference|global_field|json:rte|json:extension|blocks|group|content_types>
  --modules=<option>...   Provide the list of modules to be audited
                          <options:
                          content-types|global-fields|entries|extensions|workflows|custom-roles|assets|field-rules>
  --report-path=<value>   Path to store the audit reports

COMMON FLAGS
  -c, --config=<value>       Path of the external config
  -d, --data-dir=<value>     Path where the data is stored
      --show-console-output  Display the audit and audit fix result for individual modules

TABLE FLAGS
  --columns=<value>  Specify columns to display, comma-separated.
  --csv              Output results in CSV format.
  --filter=<value>   Filter rows by a column value (e.g., name=foo).
  --no-header        Hide table headers in output.
  --no-truncate      Prevent truncation of long text in columns.
  --output=<option>  Specify output format: csv, json, or yaml.
                     <options: csv|json|yaml>
  --sort=<value>     Sort the table by a column. Use "-" for descending.

DESCRIPTION
  Perform audits and fix possible errors in the exported Contentstack data.

ALIASES
  $ csdx audit:fix
  $ csdx cm:stacks:audit:fix

EXAMPLES
  $ csdx cm:stacks:audit:fix --copy-dir

  $ csdx cm:stacks:audit:fix --report-path=<path> --copy-dir

  $ csdx cm:stacks:audit:fix --report-path=<path> --copy-dir --csv

  $ csdx cm:stacks:audit:fix --fix-only=reference,global_field --copy-dir

  $ csdx cm:stacks:audit:fix --report-path=<path> --filter="name=<filter-value>"

  $ csdx cm:stacks:audit:fix --report-path=<path> --modules=content-types --filter="name="<filter-value>" --copy-dir --copy-path=<path>
```

_See code: [src/commands/cm/stacks/audit/fix.ts](https://github.com/contentstack/audit/blob/main/packages/contentstack-audit/src/commands/cm/stacks/audit/fix.ts)_

## `csdx help [COMMAND]`

Display help for csdx.

```
USAGE
  $ csdx help [COMMAND...] [-n]

ARGUMENTS
  [COMMAND...]  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for csdx.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.35/src/commands/help.ts)_
<!-- commandsstop -->
