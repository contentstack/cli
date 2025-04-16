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
@contentstack/cli-audit/1.11.0 darwin-arm64 node-v22.14.0
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
* [`csdx plugins`](#csdx-plugins)
* [`csdx plugins:add PLUGIN`](#csdx-pluginsadd-plugin)
* [`csdx plugins:inspect PLUGIN...`](#csdx-pluginsinspect-plugin)
* [`csdx plugins:install PLUGIN`](#csdx-pluginsinstall-plugin)
* [`csdx plugins:link PATH`](#csdx-pluginslink-path)
* [`csdx plugins:remove [PLUGIN]`](#csdx-pluginsremove-plugin)
* [`csdx plugins:reset`](#csdx-pluginsreset)
* [`csdx plugins:uninstall [PLUGIN]`](#csdx-pluginsuninstall-plugin)
* [`csdx plugins:unlink [PLUGIN]`](#csdx-pluginsunlink-plugin)
* [`csdx plugins:update`](#csdx-pluginsupdate)

## `csdx audit`

Perform audits and find possible errors in the exported Contentstack data

```
USAGE
  $ csdx audit [-c <value>] [-d <value>] [-s] [--report-path <value>] [--modules
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
  -s, --show-console-output  Display the audit and audit fix result for individual modules

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
  $ csdx audit:fix [-c <value>] [-d <value>] [-s] [--report-path <value>] [--modules
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
  -s, --show-console-output  Display the audit and audit fix result for individual modules

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
  $ csdx cm:stacks:audit [-c <value>] [-d <value>] [-s] [--report-path <value>] [--modules
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
  -s, --show-console-output  Display the audit and audit fix result for individual modules

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
  $ csdx cm:stacks:audit:fix [-c <value>] [-d <value>] [-s] [--report-path <value>] [--modules
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
  -s, --show-console-output  Display the audit and audit fix result for individual modules

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
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for csdx.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.27/src/commands/help.ts)_

## `csdx plugins`

List installed plugins.

```
USAGE
  $ csdx plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ csdx plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.36/src/commands/plugins/index.ts)_

## `csdx plugins:add PLUGIN`

Installs a plugin into csdx.

```
USAGE
  $ csdx plugins:add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into csdx.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the CSDX_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the CSDX_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ csdx plugins:add

EXAMPLES
  Install a plugin from npm registry.

    $ csdx plugins:add myplugin

  Install a plugin from a github url.

    $ csdx plugins:add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ csdx plugins:add someuser/someplugin
```

## `csdx plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ csdx plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ csdx plugins:inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.36/src/commands/plugins/inspect.ts)_

## `csdx plugins:install PLUGIN`

Installs a plugin into csdx.

```
USAGE
  $ csdx plugins:install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into csdx.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the CSDX_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the CSDX_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ csdx plugins:add

EXAMPLES
  Install a plugin from npm registry.

    $ csdx plugins:install myplugin

  Install a plugin from a github url.

    $ csdx plugins:install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ csdx plugins:install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.36/src/commands/plugins/install.ts)_

## `csdx plugins:link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ csdx plugins:link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ csdx plugins:link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.36/src/commands/plugins/link.ts)_

## `csdx plugins:remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ csdx plugins:remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ csdx plugins:unlink
  $ csdx plugins:remove

EXAMPLES
  $ csdx plugins:remove myplugin
```

## `csdx plugins:reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ csdx plugins:reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.36/src/commands/plugins/reset.ts)_

## `csdx plugins:uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ csdx plugins:uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ csdx plugins:unlink
  $ csdx plugins:remove

EXAMPLES
  $ csdx plugins:uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.36/src/commands/plugins/uninstall.ts)_

## `csdx plugins:unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ csdx plugins:unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ csdx plugins:unlink
  $ csdx plugins:remove

EXAMPLES
  $ csdx plugins:unlink myplugin
```

## `csdx plugins:update`

Update installed plugins.

```
USAGE
  $ csdx plugins:update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.36/src/commands/plugins/update.ts)_
<!-- commandsstop -->
