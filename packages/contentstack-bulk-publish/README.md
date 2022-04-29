# @contentstack/cli-cm-bulk-publish

It is Contentstack’s CLI plugin to perform bulk publish/unpublish operations on entries and assets in Contentstack. Refer to the [Bulk Publish and Unpublish documentation](https://www.contentstack.com/docs/developers/cli/bulk-publish-and-unpublish) to learn more about its commands.

[![License](https://img.shields.io/npm/l/@contentstack/cli)](https://github.com/contentstack/cli/blob/main/LICENSE)

<!-- toc -->
* [@contentstack/cli-cm-bulk-publish](#contentstackcli-cm-bulk-publish)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli-cm-bulk-publish
$ csdx COMMAND
running command...
$ csdx (-v|--version|version)
@contentstack/cli-cm-bulk-publish/1.0.0 darwin-x64 node-v16.14.2
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`csdx cm:bulk-publish`](#csdx-cmbulk-publish)
* [`csdx cm:bulk-publish:add-fields`](#csdx-cmbulk-publishadd-fields)
* [`csdx cm:bulk-publish:assets`](#csdx-cmbulk-publishassets)
* [`csdx cm:bulk-publish:cross-publish`](#csdx-cmbulk-publishcross-publish)
* [`csdx cm:bulk-publish:entries`](#csdx-cmbulk-publishentries)
* [`csdx cm:bulk-publish:entry-edits`](#csdx-cmbulk-publishentry-edits)
* [`csdx cm:bulk-publish:nonlocalized-field-changes`](#csdx-cmbulk-publishnonlocalized-field-changes)
* [`csdx cm:bulk-publish:revert`](#csdx-cmbulk-publishrevert)
* [`csdx cm:bulk-publish:unpublish`](#csdx-cmbulk-publishunpublish)
* [`csdx cm:bulk-publish:unpublished-entries`](#csdx-cmbulk-publishunpublished-entries)
* [`csdx cm:stacks:publish-clear-logs`](#csdx-cmstackspublish-clear-logs)
* [`csdx cm:stacks:publish-configure`](#csdx-cmstackspublish-configure)

## `csdx cm:bulk-publish`

Bulk Publish script for managing entries and assets

```
USAGE
  $ csdx cm:bulk-publish
```

_See code: [src/commands/cm/bulk-publish/index.js](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/index.js)_

## `csdx cm:bulk-publish:add-fields`

Add fields from updated content types to their respective entries

```
USAGE
  $ csdx cm:bulk-publish:add-fields

OPTIONS
  -B, --branch=branch              [default: main] Specify the branch to fetch the content from (default is main branch)
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
  General Usage
  csdx cm:bulk-publish:add-fields -t [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] -l [LOCALE 1] 
  [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]

  Using --config or -c flag
  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`
  csdx cm:bulk-publish:add-fields --config [PATH TO CONFIG FILE]
  csdx cm:bulk-publish:add-fields -c [PATH TO CONFIG FILE]

  Using --retryFailed or -r flag
  csdx cm:bulk-publish:add-fields --retryFailed [LOG FILE NAME]
  csdx cm:bulk-publish:add-fields -r [LOG FILE NAME]

  Using --branch or -B flag
  csdx cm:bulk-publish:add-fields -t [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] -l [LOCALE 1] 
  [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS] -B [BRANCH NAME]
```

_See code: [src/commands/cm/bulk-publish/add-fields.js](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/add-fields.js)_

## `csdx cm:bulk-publish:assets`

Publish assets to specified environments

```
USAGE
  $ csdx cm:bulk-publish:assets

OPTIONS
  -B, --branch=branch              [default: main] Specify the branch to fetch the content from (default is main branch)
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

  Environment(s) and Locale(s) are required for executing the command successfully
  But, if retryFailed flag is set, then only a logfile is required

EXAMPLES
  General Usage
  csdx cm:bulk-publish:assets -e [ENVIRONMENT 1] [ENVIRONMENT 2] -l [LOCALE] -a [MANAGEMENT TOKEN ALIAS]

  Using --config or -c flag
  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`
  csdx cm:bulk-publish:assets --config [PATH TO CONFIG FILE]
  csdx cm:bulk-publish:assets -c [PATH TO CONFIG FILE]

  Using --retryFailed or -r flag
  csdx cm:bulk-publish:assets --retryFailed [LOG FILE NAME]
  csdx cm:bulk-publish:assets -r [LOG FILE NAME]

  Using --branch or -B flag
  csdx cm:bulk-publish:assets -e [ENVIRONMENT 1] [ENVIRONMENT 2] -l [LOCALE] -a [MANAGEMENT TOKEN ALIAS] -B [BRANCH 
  NAME]
```

_See code: [src/commands/cm/bulk-publish/assets.js](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/assets.js)_

## `csdx cm:bulk-publish:cross-publish`

Publish entries and assets from one environment to other environments

```
USAGE
  $ csdx cm:bulk-publish:cross-publish

OPTIONS
  -B, --branch=branch                [default: main] Specify the branch to fetch the content from (default is main
                                     branch)

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

  --onlyAssets                       Unpublish only assets

  --onlyEntries                      Unpublish only entries

DESCRIPTION
  The cross-publish command is used for publishing entries and assets from one evironment to other environments

  Content Type, Environment, Destination Environment(s) and Locale are required for executing the command successfully
  But, if retryFailed flag is set, then only a logfile is required

EXAMPLES
  General Usage
  csdx cm:bulk-publish:cross-publish -t [CONTENT TYPE] -e [SOURCE ENV] -d [DESTINATION ENVIRONMENT] -l [LOCALE] -a 
  [MANAGEMENT TOKEN ALIAS] -x [DELIVERY TOKEN]

  Using --config or -c flag
  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`
  csdx cm:bulk-publish:cross-publish --config [PATH TO CONFIG FILE]
  csdx cm:bulk-publish:cross-publish -c [PATH TO CONFIG FILE]

  Using --retryFailed or -r flag
  csdx cm:bulk-publish:cross-publish --retryFailed [LOG FILE NAME]
  csdx cm:bulk-publish:cross-publish -r [LOG FILE NAME]

  Using --branch or -B flag
  csdx cm:bulk-publish:cross-publish -t [CONTENT TYPE] -e [SOURCE ENV] -d [DESTINATION ENVIRONMENT] -l [LOCALE] -a 
  [MANAGEMENT TOKEN ALIAS] -x [DELIVERY TOKEN] -B [BRANCH NAME]
```

_See code: [src/commands/cm/bulk-publish/cross-publish.js](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/cross-publish.js)_

## `csdx cm:bulk-publish:entries`

Publish entries from multiple content-types to multiple environments and locales

```
USAGE
  $ csdx cm:bulk-publish:entries

OPTIONS
  -B, --branch=branch              [default: main] Specify the branch to fetch the content from (default is main branch)
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
  General Usage
  csdx cm:bulk-publish:entries -t [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] -l [LOCALE 1] 
  [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]

  Using --config or -c flag
  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`
  csdx cm:bulk-publish:entries --config [PATH TO CONFIG FILE]
  csdx cm:bulk-publish:entries -c [PATH TO CONFIG FILE]

  Using --retryFailed or -r flag
  csdx cm:bulk-publish:entries --retryFailed [LOG FILE NAME]
  csdx cm:bulk-publish:entries -r [LOG FILE NAME]

  Using --branch or -B flag
  csdx cm:bulk-publish:entries -t [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] -l [LOCALE 1] 
  [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS] -B [BRANCH NAME]
```

_See code: [src/commands/cm/bulk-publish/entries.js](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/entries.js)_

## `csdx cm:bulk-publish:entry-edits`

Publish edited entries from a specified Content Type to given locales and environments

```
USAGE
  $ csdx cm:bulk-publish:entry-edits

OPTIONS
  -B, --branch=branch              [default: main] Specify the branch to fetch the content from (default is main branch)
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

  Content Type(s), Source Environment, Destination Environment(s) and Locale(s) are required for executing the command 
  successfully
  But, if retryFailed flag is set, then only a logfile is required

EXAMPLES
  General Usage
  csdx cm:bulk-publish:entry-edits -t [CONTENT TYPE 1] [CONTENT TYPE 2] -s [SOURCE_ENV] -e [ENVIRONMENT 1] [ENVIRONMENT 
  2] -l [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]

  Using --config or -c flag
  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`
  csdx cm:bulk-publish:entry-edits --config [PATH TO CONFIG FILE]
  csdx cm:bulk-publish:entry-edits -c [PATH TO CONFIG FILE]

  Using --retryFailed or -r flag
  csdx cm:bulk-publish:entry-edits --retryFailed [LOG FILE NAME]
  csdx cm:bulk-publish:entry-edits -r [LOG FILE NAME]

  Using --branch or -B flag
  csdx cm:bulk-publish:entry-edits -t [CONTENT TYPE 1] [CONTENT TYPE 2] -s [SOURCE_ENV] -e [ENVIRONMENT 1] [ENVIRONMENT 
  2] -l [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS] -B [BRANCH NAME]
```

_See code: [src/commands/cm/bulk-publish/entry-edits.js](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/entry-edits.js)_

## `csdx cm:bulk-publish:nonlocalized-field-changes`

Publish non-localized-fields for given Content Types, from a particular source environment to specified environments

```
USAGE
  $ csdx cm:bulk-publish:nonlocalized-field-changes

OPTIONS
  -B, --branch=branch              [default: main] Specify the branch to fetch the content from (default is main branch)
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
  General Usage
  csdx cm:bulk-publish:nonlocalized-field-changes -t [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 
  2] -l [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS] -s [SOURCE ENV]

  Using --config or -c flag
  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`
  csdx cm:bulk-publish:nonlocalized-field-changes --config [PATH TO CONFIG FILE]
  csdx cm:bulk-publish:nonlocalized-field-changes -c [PATH TO CONFIG FILE]

  Using --retryFailed or -r flag
  csdx cm:bulk-publish:nonlocalized-field-changes --retryFailed [LOG FILE NAME]
  csdx cm:bulk-publish:nonlocalized-field-changes -r [LOG FILE NAME]

  Using --branch or -B flag
  csdx cm:bulk-publish:nonlocalized-field-changes -t [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 
  2] -l [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS] -B [BRANCH NAME] -s [SOURCE ENV]
```

_See code: [src/commands/cm/bulk-publish/nonlocalized-field-changes.js](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/nonlocalized-field-changes.js)_

## `csdx cm:bulk-publish:revert`

Revert publish operations by using a log file

```
USAGE
  $ csdx cm:bulk-publish:revert

OPTIONS
  -l, --logFile=logFile          logfile to be used to revert
  -r, --retryFailed=retryFailed  retry publishing failed entries from the logfile

DESCRIPTION
  The revert command is used for reverting all publish operations performed using bulk-publish script.
  A log file name is required to execute revert command

EXAMPLES
  Using --logFile
  cm:bulk-publish:revert --logFile [LOG FILE NAME]
  cm:bulk-publish:revert -l [LOG FILE NAME]

  Using --retryFailed
  cm:bulk-publish:revert --retryFailed [LOG FILE NAME]
  cm:bulk-publish:revert -r [LOG FILE NAME]
```

_See code: [src/commands/cm/bulk-publish/revert.js](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/revert.js)_

## `csdx cm:bulk-publish:unpublish`

Unpublish entries of given Content Types from given environment

```
USAGE
  $ csdx cm:bulk-publish:unpublish

OPTIONS
  -B, --branch=branch                [default: main] Specify the branch to fetch the content from (default is main
                                     branch)

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

  Environment (Source Environment) and Locale are required for executing the command successfully
  But, if retryFailed flag is set, then only a logfile is required

  A Content Type can be specified for publishing entries, but if no content-type(s) is/are specified and --onlyAssets is
   not used,
  then all entries from all content types will be unpublished from the source environment

  --onlyAssets can be used to unpublish only assets and --onlyEntries can be used to unpublish only entries.
  (--onlyAssets and --onlyEntries cannot be used together at the same time)

EXAMPLES
  General Usage
  csdx cm:bulk-publish:unpublish -b -t [CONTENT TYPE] -e [SOURCE ENV] -l [LOCALE] -a [MANAGEMENT TOKEN ALIAS] -x 
  [DELIVERY TOKEN]

  Using --config or -c flag
  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`
  csdx cm:bulk-publish:unpublish --config [PATH TO CONFIG FILE]
  csdx cm:bulk-publish:unpublish -c [PATH TO CONFIG FILE]

  Using --retryFailed or -r flag
  csdx cm:bulk-publish:unpublish --retryFailed [LOG FILE NAME]
  csdx cm:bulk-publish:unpublish -r [LOG FILE NAME]

  No content type
  csdx cm:bulk-publish:unpublish --environment [SOURCE ENV] --locale [LOCALE] (Will unpublish all entries from all 
  content types and assets from the source environment)

  Using --onlyAssets
  csdx cm:bulk-publish:unpublish --environment [SOURCE ENV] --locale [LOCALE] --onlyAssets (Will unpublish only assets 
  from the source environment)

  Using --onlyEntries
  csdx cm:bulk-publish:unpublish --environment [SOURCE ENV] --locale [LOCALE] --onlyEntries (Will unpublish only 
  entries, all entries, from the source environment)
  csdx cm:bulk-publish:unpublish --contentType [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE] --onlyEntries
   (Will unpublish only entries, (from CONTENT TYPE) from the source environment)

  Using --branch or -B flag
  csdx cm:bulk-publish:unpublish -b -t [CONTENT TYPE] -e [SOURCE ENV] -l [LOCALE] -a [MANAGEMENT TOKEN ALIAS] -x 
  [DELIVERY TOKEN] -B [BRANCH NAME]
```

_See code: [src/commands/cm/bulk-publish/unpublish.js](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/unpublish.js)_

## `csdx cm:bulk-publish:unpublished-entries`

Publish unpublished entries from the source environment, to other environments and locales

```
USAGE
  $ csdx cm:bulk-publish:unpublished-entries

OPTIONS
  -B, --branch=branch              [default: main] Specify the branch to fetch the content from (default is main branch)
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

  Content Type(s), Source Environment, Destination Environment(s) and Source Locale are required for executing the 
  command successfully
  But, if retryFailed flag is set, then only a logfile is required

EXAMPLES
  General Usage
  csdx cm:bulk-publish:unpublished-entries -b -t [CONTENT TYPES] -e [ENVIRONMENTS] -l LOCALE -a [MANAGEMENT TOKEN ALIAS]
   -s [SOURCE ENV]

  Using --config or -c flag
  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`
  csdx cm:bulk-publish:unpublished-entries --config [PATH TO CONFIG FILE]
  csdx cm:bulk-publish:unpublished-entries -c [PATH TO CONFIG FILE]

  Using --retryFailed or -r flag
  csdx cm:bulk-publish:unpublished-entries --retryFailed [LOG FILE NAME]
  csdx cm:bulk-publish:unpublished-entries -r [LOG FILE NAME]

  Using --branch or -B flag
  csdx cm:bulk-publish:unpublished-entries -b -t [CONTENT TYPES] -e [ENVIRONMENTS] -l LOCALE -a [MANAGEMENT TOKEN ALIAS]
   -B [BRANCH NAME] -s [SOURCE ENV]
```

_See code: [src/commands/cm/bulk-publish/unpublished-entries.js](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/unpublished-entries.js)_

## `csdx cm:stacks:publish-clear-logs`

Clear the log folder

```
USAGE
  $ csdx cm:stacks:publish-clear-logs

OPTIONS
  -y, --yes          Delete all files without asking for confirmation
  --log-files-count  List number of log files

ALIASES
  $ csdx cm:bulk-publish:clear

EXAMPLES
  csdx cm:stacks:publish-clear-logs
  csdx cm:stacks:publish-clear-logs --log-files-count
  csdx cm:stacks:publish-clear-logs --yes
  csdx cm:stacks:publish-clear-logs -y
```

_See code: [src/commands/cm/stacks/publish-clear-logs.js](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/stacks/publish-clear-logs.js)_

## `csdx cm:stacks:publish-configure`

The configure command is used for generating a configuration file for publish script.

```
USAGE
  $ csdx cm:stacks:publish-configure

OPTIONS
  -a, --alias=alias  Management token alias for the stack

ALIASES
  $ csdx cm:bulk-publish:configure

EXAMPLES
  csdx cm:stacks:publish-configure
  csdx cm:stacks:publish-configure -a <management_token_alias>
  csdx cm:stacks:publish-configure --alias <management_token_alias>
```

_See code: [src/commands/cm/stacks/publish-configure.js](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/stacks/publish-configure.js)_
<!-- commandsstop -->
