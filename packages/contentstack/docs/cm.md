`csdx cm`
=========

perform content management activities

* [`csdx cm:bulk-publish`](#csdx-cmbulk-publish)
* [`csdx cm:bulk-publish:add-fields`](#csdx-cmbulk-publishadd-fields)
* [`csdx cm:bulk-publish:assets`](#csdx-cmbulk-publishassets)
* [`csdx cm:bulk-publish:clear`](#csdx-cmbulk-publishclear)
* [`csdx cm:bulk-publish:configure`](#csdx-cmbulk-publishconfigure)
* [`csdx cm:bulk-publish:cross-publish`](#csdx-cmbulk-publishcross-publish)
* [`csdx cm:bulk-publish:entries`](#csdx-cmbulk-publishentries)
* [`csdx cm:bulk-publish:entry-edits`](#csdx-cmbulk-publishentry-edits)
* [`csdx cm:bulk-publish:nonlocalized-field-changes`](#csdx-cmbulk-publishnonlocalized-field-changes)
* [`csdx cm:bulk-publish:revert`](#csdx-cmbulk-publishrevert)
* [`csdx cm:bulk-publish:unpublish`](#csdx-cmbulk-publishunpublish)
* [`csdx cm:bulk-publish:unpublished-entries`](#csdx-cmbulk-publishunpublished-entries)
* [`csdx cm:export`](#csdx-cmexport)
* [`csdx cm:export-to-csv`](#csdx-cmexport-to-csv)
* [`csdx cm:import`](#csdx-cmimport)
* [`csdx cm:seed`](#csdx-cmseed)
* [`csdx cm:stack-clone`](#csdx-cmstack-clone)

## `csdx cm:bulk-publish`

Bulk Publish script for managing entries and assets

```
Bulk Publish script for managing entries and assets


USAGE
  $ csdx cm:bulk-publish
```

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v0.1.1-beta.2/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/index.js)_

## `csdx cm:bulk-publish:add-fields`

Add fields from updated content types to their respective entries

```
Add fields from updated content types to their respective entries
The add-fields command is used for updating already existing entries with the updated schema of their respective Content Type

Content Types, Environments and Locales are required for executing the command successfully
But, if retryFailed flag is set, then only a logfile is required


USAGE
  $ csdx cm:bulk-publish:add-fields

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
```

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v0.1.1-beta.2/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/add-fields.js)_

## `csdx cm:bulk-publish:assets`

Publish assets to specified environments

```
Publish assets to specified environments
The assets command is used for publishing assets from the specified stack, to the specified environments

Environment(s) and Locale(s) are required for executing the command successfully
But, if retryFailed flag is set, then only a logfile is required


USAGE
  $ csdx cm:bulk-publish:assets

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
```

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v0.1.1-beta.2/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/assets.js)_

## `csdx cm:bulk-publish:clear`

Clear the log folder

```
Clear the log folder


USAGE
  $ csdx cm:bulk-publish:clear

OPTIONS
  -l, --list  List number of log files
  -y, --yes   Delete all files without asking for confirmation
```

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v0.1.1-beta.2/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/clear.js)_

## `csdx cm:bulk-publish:configure`

Generate configuration template

```
Generate configuration template
The configure command is used for generating a configuration file for bulk-publish script.

Here is a detailed description for all the available flags

-----------------------------------------------------------------------------------------------------------
--alias or -a : Management token Alias for the stack in use.

EXAMPLE : cm:bulk-publish:configure --alias [MANAGEMENT TOKEN Alias]
EXAMPLE : cm:bulk-publish:configure -a [MANAGEMENT TOKEN Alias]


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

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v0.1.1-beta.2/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/configure.js)_

## `csdx cm:bulk-publish:cross-publish`

Publish entries and assets from one environment to other environments

```
Publish entries and assets from one environment to other environments
The cross-publish command is used for publishing entries and assets from one evironment to other environments

Content Type, Environment, Destination Environment(s) and Locale are required for executing the command successfully
But, if retryFailed flag is set, then only a logfile is required


USAGE
  $ csdx cm:bulk-publish:cross-publish

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
```

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v0.1.1-beta.2/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/cross-publish.js)_

## `csdx cm:bulk-publish:entries`

Publish entries from multiple content-types to multiple environments and locales

```
Publish entries from multiple content-types to multiple environments and locales
The entries command is used for publishing entries from the specified content types, to the
specified environments and locales 

Content Types, Environments and Locales are required for executing the command successfully
But, if retryFailed flag is set, then only a logfile is required


USAGE
  $ csdx cm:bulk-publish:entries

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
```

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v0.1.1-beta.2/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/entries.js)_

## `csdx cm:bulk-publish:entry-edits`

Publish edited entries from a specified Content Type to given locales and environments

```
Publish edited entries from a specified Content Type to given locales and environments
The entry-edits command is used for publishing entries from the specified content types, to the
specified environments and locales

Content Type(s), Source Environment, Destination Environment(s) and Locale(s) are required for executing the command successfully
But, if retryFailed flag is set, then only a logfile is required


USAGE
  $ csdx cm:bulk-publish:entry-edits

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
```

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v0.1.1-beta.2/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/entry-edits.js)_

## `csdx cm:bulk-publish:nonlocalized-field-changes`

Publish non-localized-fields for given Content Types, from a particular source environment to specified environments

```
Publish non-localized-fields for given Content Types, from a particular source environment to specified environments
The nonlocalized-field-changes command is used for publishing nonlocalized field changes from the given Content Types to
the specified Environments

Content Types, Environments and Source Environment are required for executing this command successfully.
But, if retryFailed flag is set, then only a logfile is required


USAGE
  $ csdx cm:bulk-publish:nonlocalized-field-changes

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
  General Usage
  csdx cm:bulk-publish:nonlocalized-field-changes -t [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 
  2] -l [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]

  Using --config or -c flag
  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`
  csdx cm:bulk-publish:nonlocalized-field-changes --config [PATH TO CONFIG FILE]
  csdx cm:bulk-publish:nonlocalized-field-changes -c [PATH TO CONFIG FILE]

  Using --retryFailed or -r flag
  csdx cm:bulk-publish:nonlocalized-field-changes --retryFailed [LOG FILE NAME]
  csdx cm:bulk-publish:nonlocalized-field-changes -r [LOG FILE NAME]
```

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v0.1.1-beta.2/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/nonlocalized-field-changes.js)_

## `csdx cm:bulk-publish:revert`

Revert publish operations by using a log file

```
Revert publish operations by using a log file
The revert command is used for reverting all publish operations performed using bulk-publish script.
A log file name is required to execute revert command


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

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v0.1.1-beta.2/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/revert.js)_

## `csdx cm:bulk-publish:unpublish`

Unpublish entries of given Content Types from given environment

```
Unpublish entries of given Content Types from given environment
The unpublish command is used for unpublishing entries from given environment

Environment (Source Environment) and Locale are required for executing the command successfully
But, if retryFailed flag is set, then only a logfile is required

A Content Type can be specified for publishing entries, but if no content-type(s) is/are specified and --onlyAssets is not used,
then all entries from all content types will be unpublished from the source environment

--onlyAssets can be used to unpublish only assets and --onlyEntries can be used to unpublish only entries.
(--onlyAssets and --onlyEntries cannot be used together at the same time)


USAGE
  $ csdx cm:bulk-publish:unpublish

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
```

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v0.1.1-beta.2/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/unpublish.js)_

## `csdx cm:bulk-publish:unpublished-entries`

Publish unpublished entries from the source environment, to other environments and locales

```
Publish unpublished entries from the source environment, to other environments and locales
The unpublished-entries command is used for publishing unpublished entries from the source environment, to other environments and locales

Content Type(s), Source Environment, Destination Environment(s) and Source Locale are required for executing the command successfully
But, if retryFailed flag is set, then only a logfile is required


USAGE
  $ csdx cm:bulk-publish:unpublished-entries

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

  Content Type(s), Source Environment, Destination Environment(s) and Source Locale are required for executing the 
  command successfully
  But, if retryFailed flag is set, then only a logfile is required

EXAMPLES
  General Usage
  csdx cm:bulk-publish:unpublished-entries -b -t [CONTENT TYPES] -e [ENVIRONMENTS] -l LOCALE -a [MANAGEMENT TOKEN ALIAS]

  Using --config or -c flag
  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`
  csdx cm:bulk-publish:unpublished-entries --config [PATH TO CONFIG FILE]
  csdx cm:bulk-publish:unpublished-entries -c [PATH TO CONFIG FILE]

  Using --retryFailed or -r flag
  csdx cm:bulk-publish:unpublished-entries --retryFailed [LOG FILE NAME]
  csdx cm:bulk-publish:unpublished-entries -r [LOG FILE NAME]
```

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v0.1.1-beta.2/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/unpublished-entries.js)_

## `csdx cm:export`

Export content from a stack

```
Export content from a stack
...
Export content from one stack to another


USAGE
  $ csdx cm:export

OPTIONS
  -A, --auth-token                                     to use auth token
  -a, --management-token-alias=management-token-alias  alias of the management token
  -c, --config=config                                  [optional] path of the config
  -d, --data=data                                      path or location to store the data
  -m, --module=module                                  [optional] specific module name
  -s, --stack-uid=stack-uid                            API key of the source stack

DESCRIPTION
  ...
  Export content from one stack to another

EXAMPLES
  csdx cm:export -A
  csdx cm:export -A -s <stack_ApiKey> -d <path/of/export/destination/dir>
  csdx cm:export -A -c <path/to/config/dir>
  csdx cm:export -a <management_token_alias>
  csdx cm:export -a <management_token_alias> -d <path/to/export/destination/dir>
  csdx cm:export -a <management_token_alias> -c <path/to/config/file>
  csdx cm:export -A -m <single module name>
```

_See code: [@contentstack/cli-cm-export](https://github.com/contentstack/cli/blob/v0.1.1-beta.3/packages/contentstack-export/src/commands/cm/export.js)_

## `csdx cm:export-to-csv`

Export entries or organization users to csv using this command

```
Export entries or organization users to csv using this command


USAGE
  $ csdx cm:export-to-csv
```

_See code: [@contentstack/cli-cm-export-to-csv](https://github.com/contentstack/cli/blob/v0.1.0-beta.1/src/commands/cm/export-to-csv.js)_

## `csdx cm:import`

Import script for importing the content into new stack

```
Import script for importing the content into new stack
...
Once you export content from the source stack, import it to your destination stack by using the cm:import command.


USAGE
  $ csdx cm:import

OPTIONS
  -A, --auth-token                                     to use auth token
  -a, --management-token-alias=management-token-alias  alias of the management token
  -b, --backup-dir=backup-dir                          [optional] backup directory name when using specific module
  -c, --config=config                                  [optional] path of config file
  -d, --data=data                                      path and location where data is stored
  -m, --module=module                                  [optional] specific module name
  -s, --stack-uid=stack-uid                            API key of the target stack

DESCRIPTION
  ...
  Once you export content from the source stack, import it to your destination stack by using the cm:import command.

EXAMPLES
  csdx cm:import -A
  csdx cm:import -A -s <stack_ApiKey> -d <path/of/export/destination/dir>
  csdx cm:import -A -c <path/of/config/dir>
  csdx cm:import -a <management_token_alias>
  csdx cm:import -a <management_token_alias> -d <path/of/export/destination/dir>
  csdx cm:import -a <management_token_alias> -c <path/of/config/file>
  csdx cm:import -A -m <single module name>
```

_See code: [@contentstack/cli-cm-import](https://github.com/contentstack/cli/blob/v0.1.1-beta.4/packages/contentstack-import/src/commands/cm/import.js)_

## `csdx cm:seed`

Create a Stack from existing content types, entries, assets, etc

```
Create a Stack from existing content types, entries, assets, etc

USAGE
  $ csdx cm:seed

OPTIONS
  -r, --repo=repo  GitHub account or GitHub account/repository

EXAMPLES
  $ csdx cm:seed
  $ csdx cm:seed -r "account"
  $ csdx cm:seed -r "account/repository"
```

_See code: [@contentstack/cli-cm-seed](https://github.com/contentstack/cli/blob/v1.0.6/src/commands/cm/seed.ts)_

## `csdx cm:stack-clone`

Clone data (structure or content or both) of a stack into another stack

```
Clone data (structure or content or both) of a stack into another stack
Use this plugin to automate the process of cloning a stack in a few steps.


USAGE
  $ csdx cm:stack-clone

DESCRIPTION
  Use this plugin to automate the process of cloning a stack in a few steps.

EXAMPLE
  csdx cm:stack-clone
```

_See code: [@contentstack/cli-cm-clone](https://github.com/contentstack/cli/blob/v0.1.0-beta.1/src/commands/cm/stack-clone.js)_
