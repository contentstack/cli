@contentstack/cli
===

Command line tool for Contentstack

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/cli.svg)](https://npmjs.org/package/cli)
[![Downloads/week](https://img.shields.io/npm/dw/cli.svg)](https://npmjs.org/package/cli)
[![License](https://img.shields.io/npm/l/cli.svg)](https://github.com/contentstack/contentstack-cli-new/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli
$ csdx COMMAND
running command...
$ csdx (-v|--version|version)
@contentstack/cli/0.0.14 darwin-x64 node-v10.19.0
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`csdx auth:login`](#csdx-authlogin)
* [`csdx auth:logout`](#csdx-authlogout)
* [`csdx auth:tokens`](#csdx-authtokens)
* [`csdx auth:tokens:add`](#csdx-authtokensadd)
* [`csdx auth:tokens:remove`](#csdx-authtokensremove)
* [`csdx auth:whoami`](#csdx-authwhoami)
* [`csdx cm:bulk-publish`](#csdx-cmbulk-publish)
* [`csdx cm:bulk-publish:add-fields -t [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] -l [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]`](#csdx-cmbulk-publishadd-fields--t-content-type-1-content-type-2--e-environment-1-environment-2--l-locale-1-locale-2--a-management-token-alias)
* [`csdx cm:bulk-publish:assets -e [ENVIRONMENT 1] [ENVIRONMENT 2] -u [FOLDER_UID] --[no-]bulkPublish -a [MANAGEMENT TOKEN ALIAS]`](#csdx-cmbulk-publishassets--e-environment-1-environment-2--u-folder_uid---no-bulkpublish--a-management-token-alias)
* [`csdx cm:bulk-publish:clear`](#csdx-cmbulk-publishclear)
* [`csdx cm:bulk-publish:configure`](#csdx-cmbulk-publishconfigure)
* [`csdx cm:bulk-publish:cross-publish -t [CONTENT TYPE] -e [ENVIRONMENT] -d [DESTINATION ENVIRONMENT] -l [LOCALE] -a [MANAGEMENT TOKEN ALIAS] -x [DELIVERY TOKEN]`](#csdx-cmbulk-publishcross-publish--t-content-type--e-environment--d-destination-environment--l-locale--a-management-token-alias--x-delivery-token)
* [`csdx cm:bulk-publish:entries -t [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] -l [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]`](#csdx-cmbulk-publishentries--t-content-type-1-content-type-2--e-environment-1-environment-2--l-locale-1-locale-2--a-management-token-alias)
* [`csdx cm:bulk-publish:entry-edits -t [CONTENT TYPE 1] [CONTENT TYPE 2] -s [SOURCE_ENV] -e [ENVIRONMENT 1] [ENVIRONMENT 2] -l [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]`](#csdx-cmbulk-publishentry-edits--t-content-type-1-content-type-2--s-source_env--e-environment-1-environment-2--l-locale-1-locale-2--a-management-token-alias)
* [`csdx cm:bulk-publish:nonlocalized-field-changes -t [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] -l [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]`](#csdx-cmbulk-publishnonlocalized-field-changes--t-content-type-1-content-type-2--e-environment-1-environment-2--l-locale-1-locale-2--a-management-token-alias)
* [`csdx cm:bulk-publish:revert`](#csdx-cmbulk-publishrevert)
* [`csdx cm:bulk-publish:unpublish -b -t [CONTENT TYPE] -e [ENVIRONMENT] -l [LOCALE] -a [MANAGEMENT TOKEN ALIAS] -x [DELIVERY TOKEN]`](#csdx-cmbulk-publishunpublish--b--t-content-type--e-environment--l-locale--a-management-token-alias--x-delivery-token)
* [`csdx cm:bulk-publish:unpublished-entries -b -t [CONTENT TYPES] -e [ENVIRONMENTS] -l [LOCALES] -a [MANAGEMENT TOKEN ALIAS]`](#csdx-cmbulk-publishunpublished-entries--b--t-content-types--e-environments--l-locales--a-management-token-alias)
* [`csdx cm:export`](#csdx-cmexport)
* [`csdx cm:import`](#csdx-cmimport)
* [`csdx config:get:region`](#csdx-configgetregion)
* [`csdx config:set:region [REGION]`](#csdx-configsetregion-region)
* [`csdx help [COMMAND]`](#csdx-help-command)
* [`csdx plugins`](#csdx-plugins)
* [`csdx plugins:install PLUGIN...`](#csdx-pluginsinstall-plugin)
* [`csdx plugins:link PLUGIN`](#csdx-pluginslink-plugin)
* [`csdx plugins:uninstall PLUGIN...`](#csdx-pluginsuninstall-plugin)
* [`csdx plugins:update`](#csdx-pluginsupdate)

## `csdx auth:login`

Login to Contentstack and save the session for further use

```
USAGE
  $ csdx auth:login

OPTIONS
  -u, --username=username  Email address of your Contentstack account

ALIASES
  $ csdx login
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/v0.0.1/src/commands/auth/login.js)_

## `csdx auth:logout`

Log out from Contentstack and clear the session

```
USAGE
  $ csdx auth:logout

OPTIONS
  -f, --force  Exclude confirmation to logout

ALIASES
  $ csdx logout
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/v0.0.1/src/commands/auth/logout.js)_

## `csdx auth:tokens`

Use to list all existing management tokens

```
USAGE
  $ csdx auth:tokens

OPTIONS
  -x, --extended          show extra columns
  --columns=columns       only show provided columns (comma-separated)
  --csv                   output is csv format [alias: --output=csv]
  --filter=filter         filter property by partial string matching, ex: name=foo
  --no-header             hide table header from output
  --no-truncate           do not truncate output to fit screen
  --output=csv|json|yaml  output in a more machine friendly format
  --sort=sort             property to sort by (prepend '-' for descending)

ALIASES
  $ csdx tokens
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/v0.0.1/src/commands/auth/tokens/index.js)_

## `csdx auth:tokens:add`

Adds management/delivery tokens to your session to use it with further Contentstack/CLI command

```
USAGE
  $ csdx auth:tokens:add

OPTIONS
  -a, --alias=alias
  -d, --delivery                 Set this while saving delivery token
  -e, --environment=environment  Environment name for delivery token
  -f, --force                    Exclude confirmation to replace existing alias
  -k, --api-key=api-key          Stack API key for the token
  -m, --management               Set this while saving management token

  -t, --token=token              Sets token. Can be set via environment variable 'TOKEN'. We recommend to use env
                                 variable

DESCRIPTION
  by default it adds management token if either of management or delivery flags are not set

ALIASES
  $ csdx tokens:add
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/v0.0.1/src/commands/auth/tokens/add.js)_

## `csdx auth:tokens:remove`

Removes stored tokens

```
USAGE
  $ csdx auth:tokens:remove

OPTIONS
  -a, --alias=alias  Alias (name) of the token to remove

  -i, --ignore       Ignores if token not present. Command shows show list of available aliases with multi select option
                     to delete tokens from that list.

ALIASES
  $ csdx tokens:remove
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/v0.0.1/src/commands/auth/tokens/remove.js)_

## `csdx auth:whoami`

Display current users email address

```
USAGE
  $ csdx auth:whoami

ALIASES
  $ csdx whoami
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/v0.0.1/src/commands/auth/whoami.js)_

## `csdx cm:bulk-publish`

Bulk Publish script for managing entries and assets

```
USAGE
  $ csdx cm:bulk-publish
```

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v0.0.20/src/commands/cm/bulk-publish/index.js)_

## `csdx cm:bulk-publish:add-fields -t [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] -l [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]`

Add fields from updated content types to their respective entries

```
USAGE
  $ csdx cm:bulk-publish:add-fields -t [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] -l [LOCALE 
  1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]

OPTIONS
  -a, --alias=alias                Alias for the management token to be used

  -b, --bulkPublish=bulkPublish    [default: true] This flag is set to true by default. It indicates that contentstack's
                                   bulkpublish API will be used for publishing the entries

  -c, --config=config              Path to config file to be used

  -e, --environments=environments  Environments to which entries need to be published

  -l, --locales=locales            Locales to which entries need to be published

  -r, --retryFailed=retryFailed    Retry publishing failed entries from the logfile (optional, overrides all other
                                   flags)

  -t, --contentTypes=contentTypes  The Content-Types from which entries need to be published

  -y, --yes                        Agree to process the command with the current configuration

DESCRIPTION
  The add-fields command is used for updating already existing entries with the updated schema of their respective 
  Content Type

  Content Types, Environments and Locales are required for executing the command successfully
  But, if retryFailed flag is set, then only a logfile is required

EXAMPLES
  Using --config or -c flag
  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`
  csdx cm:bulk-publish:add-fields --config [PATH TO CONFIG FILE]
  csdx cm:bulk-publish:add-fields -c [PATH TO CONFIG FILE]

  Using --retryFailed or -r flag
  csdx cm:bulk-publish:add-fields --retryFailed [PATH TO LOG FILE]
  csdx cm:bulk-publish:add-fields -r [PATH TO LOG FILE]
```

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v0.0.20/src/commands/cm/bulk-publish/add-fields.js)_

## `csdx cm:bulk-publish:assets -e [ENVIRONMENT 1] [ENVIRONMENT 2] -u [FOLDER_UID] --[no-]bulkPublish -a [MANAGEMENT TOKEN ALIAS]`

Publish assets to specified environments

```
USAGE
  $ csdx cm:bulk-publish:assets -e [ENVIRONMENT 1] [ENVIRONMENT 2] -u [FOLDER_UID] --[no-]bulkPublish -a [MANAGEMENT 
  TOKEN ALIAS]

OPTIONS
  -a, --alias=alias                Alias for the management token to be used

  -b, --bulkPublish=bulkPublish    [default: true] This flag is set to true by default. It indicates that contentstack's
                                   bulkpublish API will be used for publishing the entries

  -c, --config=config              Path to config file to be used

  -e, --environments=environments  Environments to which assets need to be published

  -l, --locales=locales            Locales to which assets need to be published

  -r, --retryFailed=retryFailed    Retry publishing failed assets from the logfile (optional, will override all other
                                   flags)

  -u, --folderUid=folderUid        [default: cs_root] Folder-uid from which the assets need to be published

  -y, --yes                        Agree to process the command with the current configuration

DESCRIPTION
  The assets command is used for publishing assets from the specified stack, to the specified environments

  Environment/s are required for executing the command successfully
  But, if retryFailed flag is set, then only a logfile is required

EXAMPLES
  Using --config or -c flag
  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`
  csdx cm:bulk-publish:assets --config [PATH TO CONFIG FILE]
  csdx cm:bulk-publish:assets -c [PATH TO CONFIG FILE]

  Using --retryFailed or -r flag
  csdx cm:bulk-publish:assets --retryFailed [PATH TO LOG FILE]
  csdx cm:bulk-publish:assets -r [PATH TO LOG FILE]
```

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v0.0.20/src/commands/cm/bulk-publish/assets.js)_

## `csdx cm:bulk-publish:clear`

Clear the log folder

```
USAGE
  $ csdx cm:bulk-publish:clear

OPTIONS
  -l, --list  List number of log files
  -y, --yes   Delete all files without asking for confirmation
```

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v0.0.20/src/commands/cm/bulk-publish/clear.js)_

## `csdx cm:bulk-publish:configure`

Generate configuration template

```
USAGE
  $ csdx cm:bulk-publish:configure

OPTIONS
  -a, --alias=alias  Management token alias for the stack

DESCRIPTION
  The configure command is used for generating a configuration file for bulk-publish script.

  Here is a detailed description for all the available flags

  -----------------------------------------------------------------------------------------------------------
  --alias or -a : Management token Alias for the stack in use.

  EXAMPLE : cm:bulk-publish:configure --alias [MANAGEMENT TOKEN Alias]
  EXAMPLE : cm:bulk-publish:configure -a [MANAGEMENT TOKEN Alias]
```

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v0.0.20/src/commands/cm/bulk-publish/configure.js)_

## `csdx cm:bulk-publish:cross-publish -t [CONTENT TYPE] -e [ENVIRONMENT] -d [DESTINATION ENVIRONMENT] -l [LOCALE] -a [MANAGEMENT TOKEN ALIAS] -x [DELIVERY TOKEN]`

Publish entries and assets from one environment to other environments

```
USAGE
  $ csdx cm:bulk-publish:cross-publish -t [CONTENT TYPE] -e [ENVIRONMENT] -d [DESTINATION ENVIRONMENT] -l [LOCALE] -a 
  [MANAGEMENT TOKEN ALIAS] -x [DELIVERY TOKEN]

OPTIONS
  -a, --alias=alias                  Alias for the management token to be used

  -b, --bulkPublish=bulkPublish      [default: true] This flag is set to true by default. It indicates that
                                     contentstack's bulkpublish API will be used for publishing the entries

  -c, --config=config                Path to config file to be used

  -d, --destEnv=destEnv              Destination Environments

  -e, --environment=environment      Source Environment

  -l, --locale=locale                Locale filter

  -r, --retryFailed=retryFailed      Retry publishing failed entries from the logfile (optional, overrides all other
                                     flags)

  -t, --contentType=contentType      Content-Type filter

  -x, --deliveryToken=deliveryToken  Delivery Token for source environment

  -y, --yes                          Agree to process the command with the current configuration

DESCRIPTION
  The cross-publish command is used for publishing entries and assets from one evironment to other environments

  Content Types, Environments and Locales are required for executing the command successfully
  But, if retryFailed flag is set, then only a logfile is required

EXAMPLES
  Using --config or -c flag
  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`
  csdx cm:bulk-publish:cross-publish --config [PATH TO CONFIG FILE]
  csdx cm:bulk-publish:cross-publish -c [PATH TO CONFIG FILE]

  Using --retryFailed or -r flag
  csdx cm:bulk-publish:cross-publish --retryFailed [PATH TO LOG FILE]
  csdx cm:bulk-publish:cross-publish -r [PATH TO LOG FILE]
```

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v0.0.20/src/commands/cm/bulk-publish/cross-publish.js)_

## `csdx cm:bulk-publish:entries -t [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] -l [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]`

Publish entries from multiple content-types to multiple environments and locales

```
USAGE
  $ csdx cm:bulk-publish:entries -t [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] -l [LOCALE 1] 
  [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]

OPTIONS
  -a, --alias=alias                Alias for the management token to be used

  -b, --bulkPublish=bulkPublish    [default: true] This flag is set to true by default. It indicates that contentstack's
                                   bulkpublish API will be used for publishing the entries

  -c, --config=config              Path for the external config file to be used (A new config file can be generated at
                                   the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`)

  -e, --environments=environments  Environments to which entries need to be published

  -l, --locales=locales            Locales to which entries need to be published

  -o, --publishAllContentTypes     Publish all content-types (optional, cannot be set when contentTypes flag is set)

  -r, --retryFailed=retryFailed    Retry failed entries from the logfile (optional, overrides all other flags) This flag
                                   is used to retry publishing entries that failed to publish in a previous attempt. A
                                   log file for the previous session will be required for processing the failed entries

  -t, --contentTypes=contentTypes  The Content-types from which entries need to be published

  -y, --yes                        Agree to process the command with the current configuration

DESCRIPTION
  The entries command is used for publishing entries from the specified content types, to the
  specified environments and locales 

  Content Types, Environments and Locales are required for executing the command successfully
  But, if retryFailed flag is set, then only a logfile is required

EXAMPLES
  Using --config or -c flag
  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`
  csdx cm:bulk-publish:entries --config [PATH TO CONFIG FILE]
  csdx cm:bulk-publish:entries -c [PATH TO CONFIG FILE]

  Using --retryFailed or -r flag
  csdx cm:bulk-publish:entries --retryFailed [PATH TO LOG FILE]
  csdx cm:bulk-publish:entries -r [PATH TO LOG FILE]
```

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v0.0.20/src/commands/cm/bulk-publish/entries.js)_

## `csdx cm:bulk-publish:entry-edits -t [CONTENT TYPE 1] [CONTENT TYPE 2] -s [SOURCE_ENV] -e [ENVIRONMENT 1] [ENVIRONMENT 2] -l [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]`

Publish edited entries from a specified Content Type to given locales and environments

```
USAGE
  $ csdx cm:bulk-publish:entry-edits -t [CONTENT TYPE 1] [CONTENT TYPE 2] -s [SOURCE_ENV] -e [ENVIRONMENT 1] 
  [ENVIRONMENT 2] -l [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]

OPTIONS
  -a, --alias=alias                Alias for the management token to be used

  -b, --bulkPublish=bulkPublish    [default: true] This flag is set to true by default. It indicates that contentstack's
                                   bulkpublish API will be used for publishing the entries

  -c, --config=config              Path to config file to be used

  -e, --environments=environments  Destination environments

  -l, --locales=locales            Locales to which edited entries need to be published

  -r, --retryFailed=retryFailed    Retry publishing failed entries from the logfile (optional, overrides all other
                                   flags)

  -s, --sourceEnv=sourceEnv        Environment from which edited entries will be published

  -t, --contentTypes=contentTypes  The Content-Types which will be checked for edited entries

  -y, --yes                        Agree to process the command with the current configuration

DESCRIPTION
  The entry-edits command is used for publishing entries from the specified content types, to the
  specified environments and locales

  Content Types, Environments and Locales are required for executing the command successfully
  But, if retryFailed flag is set, then only a logfile is required

EXAMPLES
  Using --config or -c flag
  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`
  csdx cm:bulk-publish:entry-edits --config [PATH TO CONFIG FILE]
  csdx cm:bulk-publish:entry-edits -c [PATH TO CONFIG FILE]

  Using --retryFailed or -r flag
  csdx cm:bulk-publish:entry-edits --retryFailed [PATH TO LOG FILE]
  csdx cm:bulk-publish:entry-edits -r [PATH TO LOG FILE]
```

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v0.0.20/src/commands/cm/bulk-publish/entry-edits.js)_

## `csdx cm:bulk-publish:nonlocalized-field-changes -t [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] -l [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]`

Publish non-localized-fields for given Content Types, from a particular source environment to specified environments

```
USAGE
  $ csdx cm:bulk-publish:nonlocalized-field-changes -t [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 
  2] -l [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]

OPTIONS
  -a, --alias=alias                Alias for the management token to be used

  -b, --bulkPublish=bulkPublish    [default: true] This flag is set to true by default. It indicates that contentstack's
                                   bulkpublish API will be used for publishing the entries

  -c, --config=config              Path to config file to be used

  -e, --environments=environments  Destination environments

  -r, --retryFailed=retryFailed    Retry publishing failed entries from the logfile

  -s, --sourceEnv=sourceEnv        Source Environment

  -t, --contentTypes=contentTypes  The Content-Types from which entries need to be published

  -y, --yes                        Agree to process the command with the current configuration

DESCRIPTION
  The nonlocalized-field-changes command is used for publishing nonlocalized field changes from the given Content Types 
  to
  the specified Environments

  Content Types, Environments and Source Environment are required for executing this command successfully.
  But, if retryFailed flag is set, then only a logfile is required

EXAMPLES
  Using --config or -c flag
  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`
  csdx cm:bulk-publish:nonlocalized-field-changes --config [PATH TO CONFIG FILE]
  csdx cm:bulk-publish:nonlocalized-field-changes -c [PATH TO CONFIG FILE]

  Using --retryFailed or -r flag
  csdx cm:bulk-publish:nonlocalized-field-changes --retryFailed [PATH TO LOG FILE]
  csdx cm:bulk-publish:nonlocalized-field-changes -r [PATH TO LOG FILE]
```

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v0.0.20/src/commands/cm/bulk-publish/nonlocalized-field-changes.js)_

## `csdx cm:bulk-publish:revert`

Revert publish operations by using a log file

```
USAGE
  $ csdx cm:bulk-publish:revert

OPTIONS
  -l, --logFile=logFile          logfile to be used to revert
  -r, --retryFailed=retryFailed  retry publishing failed entries from the logfile

DESCRIPTION
  ...
  The revert command is used for reverting all publish operations performed using bulk-publish script.

  Here is a detailed description for all the available flags
  -----------------------------------------------------------------------------------------------------------
  --retryFailed or -r : This flag is used to retry publishing entries or assets, that failed to publish in a previous
  attempt. A log file for the previous session will be required for processing the failed elements. 

  NOTE: When retryFailed flag is set, all other flags will be ignored

  EXAMPLE : cm:bulk-publish:revert --retryFailed [PATH TO LOG FILE]
  EXAMPLE : cm:bulk-publish:revert -r [PATH TO LOG FILE]
  -----------------------------------------------------------------------------------------------------------
  --logFile or -l : logFile to be used for revert

  EXAMPLE : cm:bulk-publish:revert --logFile [PATH TO LOG FILE]
  EXAMPLE : cm:bulk-publish:revert -l [PATH TO LOG FILE]
  -----------------------------------------------------------------------------------------------------------
```

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v0.0.20/src/commands/cm/bulk-publish/revert.js)_

## `csdx cm:bulk-publish:unpublish -b -t [CONTENT TYPE] -e [ENVIRONMENT] -l [LOCALE] -a [MANAGEMENT TOKEN ALIAS] -x [DELIVERY TOKEN]`

Unpublish entries of given Content Types from given environment

```
USAGE
  $ csdx cm:bulk-publish:unpublish -b -t [CONTENT TYPE] -e [ENVIRONMENT] -l [LOCALE] -a [MANAGEMENT TOKEN ALIAS] -x 
  [DELIVERY TOKEN]

OPTIONS
  -a, --alias=alias                  Alias for the management token to be used

  -b, --bulkUnpublish=bulkUnpublish  [default: true] This flag is set to true by default. It indicates that
                                     contentstack's bulkpublish API will be used for publishing the entries

  -c, --config=config                Path to config file to be used

  -e, --environment=environment      Source Environment

  -l, --locale=locale                Locale filter

  -r, --retryFailed=retryFailed      Retry publishing failed entries from the logfile

  -t, --contentType=contentType      Content Type filter

  -x, --deliveryToken=deliveryToken  Delivery Token for source environment

  -y, --yes                          Agree to process the command with the current configuration

  --onlyAssets                       Unpublish only assets

  --onlyEntries                      Unpublish only entries

DESCRIPTION
  The unpublish command is used for unpublishing entries from given environment

  Content Types, Environments and Locales are required for executing the command successfully
  But, if retryFailed flag is set, then only a logfile is required

EXAMPLES
  Using --config or -c flag
  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`
  csdx cm:bulk-publish:unpublish --config [PATH TO CONFIG FILE]
  csdx cm:bulk-publish:unpublish -c [PATH TO CONFIG FILE]

  Using --retryFailed or -r flag
  csdx cm:bulk-publish:unpublish --retryFailed [PATH TO LOG FILE]
  csdx cm:bulk-publish:unpublish -r [PATH TO LOG FILE]
```

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v0.0.20/src/commands/cm/bulk-publish/unpublish.js)_

## `csdx cm:bulk-publish:unpublished-entries -b -t [CONTENT TYPES] -e [ENVIRONMENTS] -l [LOCALES] -a [MANAGEMENT TOKEN ALIAS]`

Publish unpublished entries from the source environment, to other environments and locales

```
USAGE
  $ csdx cm:bulk-publish:unpublished-entries -b -t [CONTENT TYPES] -e [ENVIRONMENTS] -l [LOCALES] -a [MANAGEMENT TOKEN 
  ALIAS]

OPTIONS
  -a, --alias=alias                Alias for the management token to be used

  -b, --bulkPublish=bulkPublish    [default: true] This flag is set to true by default. It indicates that contentstack's
                                   bulkpublish API will be used for publishing the entries

  -c, --config=config              Path to config file to be used

  -e, --environments=environments  Destination environments

  -l, --locale=locale              Source locale

  -r, --retryFailed=retryFailed    Retry publishing failed entries from the logfile

  -s, --sourceEnv=sourceEnv        Source Env

  -t, --contentTypes=contentTypes  The Content-Types from which entries need to be published

  -y, --yes                        Agree to process the command with the current configuration

DESCRIPTION
  The unpublished-entries command is used for publishing unpublished entries from the source environment, to other 
  environments and locales

  Content Types, Environments and Locales are required for executing the command successfully
  But, if retryFailed flag is set, then only a logfile is required

EXAMPLES
  Using --config or -c flag
  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`
  csdx cm:bulk-publish:unpublished-entries --config [PATH TO CONFIG FILE]
  csdx cm:bulk-publish:unpublished-entries -c [PATH TO CONFIG FILE]

  Using --retryFailed or -r flag
  csdx cm:bulk-publish:unpublished-entries --retryFailed [PATH TO LOG FILE]
  csdx cm:bulk-publish:unpublished-entries -r [PATH TO LOG FILE]
```

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v0.0.20/src/commands/cm/bulk-publish/unpublished-entries.js)_

## `csdx cm:export`

Export utils for exporting the content from stack

```
USAGE
  $ csdx cm:export

OPTIONS
  -A, --auth-token                                     to use auth token
  -a, --management-token-alias=management-token-alias  alias of the management token
  -c, --config=config                                  [optional]path of the config
  -d, --data=data                                      path or location to store the data
  -l, --master-lang=master-lang                        code of the source stacks master Language
  -m, --module=module                                  [optional] specific module name
  -s, --stack-uid=stack-uid                            API key of source stack

DESCRIPTION
  ...
  Export content from one stack to another

EXAMPLES
  csdx cm:export -A
  csdx cm:export -A -l 'master-language' -s 'stack_ApiKey' -d 'path/of/export/destination/dir'
  csdx cm:export -A -c 'path/of/config/dir'
  csdx cm:export -a 'alias of managment_token'
  csdx cm:export -a "alias of managment_token"  -l "master-language" -d "path/of/export/destination/dir"
  csdx cm:export -a "alias of managment_token" -c "path/of/config/file"
  csdx cm:export -A -m "single module name"
```

_See code: [@contentstack/cli-cm-export](https://github.com/contentstack/cli/blob/v0.0.27/src/commands/cm/export.js)_

## `csdx cm:import`

Import script for importing the content into new stack

```
USAGE
  $ csdx cm:import

OPTIONS
  -A, --auth-token                                     to use auth token
  -a, --management-token-alias=management-token-alias  alias of the management token
  -c, --config=config                                  [optional]path of config file
  -d, --data=data                                      path and location where data is stored
  -l, --master-lang=master-lang                        code of the target stacks master language
  -m, --module=module                                  [optional] specific module name
  -s, --stack-uid=stack-uid                            API key of the target stack

DESCRIPTION
  ...
  Once you export content from the source stack, import it to your destination stack by using the cm:import command.

EXAMPLES
  csdx cm:import -A
  csdx cm:import -A -l "master-language" -s "stack_ApiKey" -d "path/of/export/destination/dir"
  csdx cm:import -A -c "path/of/config/dir"
  csdx cm:import -a "alias of managment_token"
  csdx cm:import -a "alias of managment_token"  -l "master-language" -d "path/of/export/destination/dir"
  csdx cm:import -a "alias of managment_token" -c "path/of/config/file"
  csdx cm:import -A -m "single module name"
```

_See code: [@contentstack/cli-cm-import](https://github.com/contentstack/cli/blob/v0.0.23/src/commands/cm/import.js)_

## `csdx config:get:region`

Get current region set for CLI

```
USAGE
  $ csdx config:get:region
```

_See code: [src/commands/config/get/region.js](https://github.com/contentstack/cli/blob/v0.0.14/src/commands/config/get/region.js)_

## `csdx config:set:region [REGION]`

Set region for CLI

```
USAGE
  $ csdx config:set:region [REGION]

ARGUMENTS
  REGION  (EU|NA) North America(NA), Europe (EU)

OPTIONS
  -d, --cda=cda    Custom host to set for content delivery API, if this flag is added then cma and name flags are
                   required

  -m, --cma=cma    Custom host to set for content management API, , if this flag is added then cda and name flags are
                   required

  -n, --name=name  Name for the region, if this flag is added then cda and cma flags are required

EXAMPLES
  $ csdx config:set:region EU
  $ csdx config:set:region --cma "https://in-cda.contentstack.com" --cda "https://in-api.contentstack.com" --name 
  "India"
  $ csdx config:set:region --cma="https://in-cda.contentstack.com" --cda="https://in-api.contentstack.com" 
  --name="India"
```

_See code: [src/commands/config/set/region.js](https://github.com/contentstack/cli/blob/v0.0.14/src/commands/config/set/region.js)_

## `csdx help [COMMAND]`

display help for csdx

```
USAGE
  $ csdx help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.2.3/src/commands/help.ts)_

## `csdx plugins`

list installed plugins

```
USAGE
  $ csdx plugins

OPTIONS
  --core  show core plugins

EXAMPLE
  $ csdx plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.9.0/src/commands/plugins/index.ts)_

## `csdx plugins:install PLUGIN...`

installs a plugin into the CLI

```
USAGE
  $ csdx plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  plugin to install

OPTIONS
  -f, --force    yarn install with force flag
  -h, --help     show CLI help
  -v, --verbose

DESCRIPTION
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command 
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in 
  the CLI without the need to patch and update the whole CLI.

ALIASES
  $ csdx plugins:add

EXAMPLES
  $ csdx plugins:install myplugin 
  $ csdx plugins:install https://github.com/someuser/someplugin
  $ csdx plugins:install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.9.0/src/commands/plugins/install.ts)_

## `csdx plugins:link PLUGIN`

links a plugin into the CLI for development

```
USAGE
  $ csdx plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

OPTIONS
  -h, --help     show CLI help
  -v, --verbose

DESCRIPTION
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello' 
  command will override the user-installed or core plugin implementation. This is useful for development work.

EXAMPLE
  $ csdx plugins:link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.9.0/src/commands/plugins/link.ts)_

## `csdx plugins:uninstall PLUGIN...`

removes a plugin from the CLI

```
USAGE
  $ csdx plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

OPTIONS
  -h, --help     show CLI help
  -v, --verbose

ALIASES
  $ csdx plugins:unlink
  $ csdx plugins:remove
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.9.0/src/commands/plugins/uninstall.ts)_

## `csdx plugins:update`

update installed plugins

```
USAGE
  $ csdx plugins:update

OPTIONS
  -h, --help     show CLI help
  -v, --verbose
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.9.0/src/commands/plugins/update.ts)_
<!-- commandsstop -->
