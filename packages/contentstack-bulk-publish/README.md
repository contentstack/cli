# @contentstack/cli-cm-bulk-publish

It is Contentstack’s CLI plugin to perform bulk publish/unpublish operations on entries and assets in Contentstack. Refer to the [Bulk Publish and Unpublish documentation](https://www.contentstack.com/docs/developers/cli/bulk-publish-and-unpublish) to learn more about its commands.

[![License](https://img.shields.io/npm/l/@contentstack/cli)](https://github.com/contentstack/cli/blob/main/LICENSE)

<!-- toc -->

- [@contentstack/cli-cm-bulk-publish](#contentstackcli-cm-bulk-publish)
- [Usage](#usage)
- [Commands](#commands)
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

- [`csdx cm:assets:publish`](#csdx-cmassetspublish)
- [`csdx cm:assets:unpublish`](#csdx-cmassetsunpublish)
- [`csdx cm:bulk-publish`](#csdx-cmbulk-publish)
- [`csdx cm:bulk-publish:cross-publish`](#csdx-cmbulk-publishcross-publish)
- [`csdx cm:bulk-publish:entry-edits`](#csdx-cmbulk-publishentry-edits)
- [`csdx cm:bulk-publish:unpublished-entries`](#csdx-cmbulk-publishunpublished-entries)
- [`csdx cm:entries:publish`](#csdx-cmentriespublish)
- [`csdx cm:entries:publish-non-localized-fields`](#csdx-cmentriespublish-non-localized-fields)
- [`csdx cm:entries:unpublish`](#csdx-cmentriesunpublish)
- [`csdx cm:entries:update-and-publish`](#csdx-cmentriesupdate-and-publish)
- [`csdx cm:stacks:publish-clear-logs`](#csdx-cmstackspublish-clear-logs)
- [`csdx cm:stacks:publish-configure`](#csdx-cmstackspublish-configure)
- [`csdx cm:stacks:publish-revert`](#csdx-cmstackspublish-revert)
- [`csdx cm:stacks:unpublish`](#csdx-cmstacksunpublish)

## `csdx cm:assets:publish`

Publish assets to specified environments

```
USAGE
  $ csdx cm:assets:publish

OPTIONS
  -B, --branch=branch              [default: main] Specify the branch to fetch the content from (default is main branch)
  -a, --alias=alias                Alias for the management token to be used
  -c, --config=config              Path to config file to be used
  -e, --environments=environments  Environments to which assets need to be published
  -l, --locales=locales            Locales to which assets need to be published
  -y, --yes                        Agree to process the command with the current configuration

  --bulk-publish=bulk-publish      [default: true] This flag is set to true by default. It indicates that contentstack's
                                   bulkpublish API will be used for publishing the entries

  --folder-uid=folder-uid          [default: cs_root] Folder-uid from which the assets need to be published

  --retry-failed=retry-failed      Retry publishing failed assets from the logfile (optional, will override all other
                                   flags)

DESCRIPTION
  The assets command is used for publishing assets from the specified stack, to the specified environments

  Environment(s) and Locale(s) are required for executing the command successfully
  But, if retryFailed flag is set, then only a logfile is required

ALIASES
  $ csdx cm:bulk-publish:assets

EXAMPLES
  General Usage
  csdx cm:assets:publish --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE] --alias [MANAGEMENT TOKEN
  ALIAS]

  Using --config or -c flag
  Generate a config file at the current working directory using `csdx cm:stacks:publish-configure -a [ALIAS]`
  csdx cm:assets:publish --config [PATH TO CONFIG FILE]
  csdx cm:assets:publish -c [PATH TO CONFIG FILE]

  Using --retry-failed flag
  csdx cm:assets:publish --retry-failed [LOG FILE NAME]

  Using --branch flag
  csdx cm:assets:publish --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE] --alias [MANAGEMENT TOKEN
  ALIAS] --branch [BRANCH NAME]
```

_See code: [src/commands/cm/assets/publish.js](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/assets/publish.js)_

## `csdx cm:assets:unpublish`

Unpublish assets from given environment

```
USAGE
  $ csdx cm:assets:unpublish

OPTIONS
  -a, --alias=alias                Alias for the management token to be used
  -c, --config=config              Path to config file to be used
  -e, --environment=environment    Source Environment
  -y, --yes                        Agree to process the command with the current configuration
  --branch=branch                  [default: main] Specify the branch to fetch the content from (default is main branch)

  --bulk-unpublish=bulk-unpublish  [default: true] This flag is set to true by default. It indicates that contentstack's
                                   bulkpublish API will be used for publishing the entries

  --delivery-token=delivery-token  Delivery Token for source environment

  --locale=locale                  Locale filter

  --retry-failed=retry-failed      Retry publishing failed entries from the logfile

DESCRIPTION
  The unpublish command is used for unpublishing assets from given environment

  Environment (Source Environment) and Locale are required for executing the command successfully
  But, if retry-failed flag is set, then only a logfile is required

EXAMPLES
  General Usage
  csdx cm:assets:unpublish --bulk-unpublish --environment [SOURCE ENV] --locale [LOCALE] --alias [MANAGEMENT TOKEN
  ALIAS] --delivery-token [DELIVERY TOKEN]

  Using --config or -c flag
  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure --alias [ALIAS]`
  csdx cm:assets:unpublish --config [PATH TO CONFIG FILE]
  csdx cm:assets:unpublish -c [PATH TO CONFIG FILE]

  Using --retry-failed flag
  csdx cm:assets:unpublish --retry-failed [LOG FILE NAME]

  Using --branch flag
  csdx cm:assets:unpublish --bulk-unpublish --environment [SOURCE ENV] --locale [LOCALE] --alias [MANAGEMENT TOKEN
  ALIAS] --delivery-token [DELIVERY TOKEN] --branch [BRANCH NAME]
```

_See code: [src/commands/cm/assets/unpublish.js](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/assets/unpublish.js)_

## `csdx cm:bulk-publish`

Bulk Publish script for managing entries and assets

```
USAGE
  $ csdx cm:bulk-publish
```

_See code: [src/commands/cm/bulk-publish/index.js](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/index.js)_

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

## `csdx cm:entries:publish`

Publish entries from multiple content-types to multiple environments and locales

```
USAGE
  $ csdx cm:entries:publish

OPTIONS
  -B, --branch=branch              [default: main] Specify the branch to fetch the content from (default is main branch)
  -a, --alias=alias                Alias for the management token to be used

  -c, --config=config              Path for the external config file to be used (A new config file can be generated at
                                   the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`)

  -e, --environments=environments  Environments to which entries need to be published

  -l, --locales=locales            Locales to which entries need to be published

  -y, --yes                        Agree to process the command with the current configuration

  --bulk-publish=bulk-publish      [default: true] This flag is set to true by default. It indicates that contentstack's
                                   bulkpublish API will be used for publishing the entries

  --content-types=content-types    The Content-Types from which entries need to be published

  --publish-all-content-types      Publish all content-types (optional, cannot be set when contentTypes flag is set)

  --retry-failed=retry-failed      Retry failed entries from the logfile (optional, overrides all other flags) This flag
                                   is used to retry publishing entries that failed to publish in a previous attempt. A
                                   log file for the previous session will be required for processing the failed entries

DESCRIPTION
  The entries command is used for publishing entries from the specified content types, to the
  specified environments and locales

  Content Types, Environments and Locales are required for executing the command successfully
  But, if retry-failed flag is set, then only a logfile is required

ALIASES
  $ csdx cm:bulk-publish:entries

EXAMPLES
  General Usage
  csdx cm:entries:publish -t [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locale [LOCALE 1]
  [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]

  Using --config or -c flag
  Generate a config file at the current working directory using `csdx cm:stacks:publish-configure -a [ALIAS]`
  csdx cm:entries:publish --config [PATH TO CONFIG FILE]
  csdx cm:entries:publish -c [PATH TO CONFIG FILE]

  Using --retry-failed
  csdx cm:entries:publish --retry-failed [LOG FILE NAME]
  csdx cm:entries:publish -r [LOG FILE NAME]

  Using --branch
  csdx cm:entries:publish --content-type [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locale
  [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS] --branch [BRANCH NAME]
```

_See code: [src/commands/cm/entries/publish.js](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/entries/publish.js)_

## `csdx cm:entries:publish-non-localized-fields`

Publish non-localized-fields for given Content Types, from a particular source environment to specified environments

```
USAGE
  $ csdx cm:entries:publish-non-localized-fields

OPTIONS
  -B, --branch=branch              [default: main] Specify the branch to fetch the content from (default is main branch)
  -a, --alias=alias                Alias for the management token to be used
  -c, --config=config              Path to config file to be used
  -e, --environments=environments  Destination environments
  -y, --yes                        Agree to process the command with the current configuration

  --bulk-publish=bulk-publish      [default: true] This flag is set to true by default. It indicates that contentstack's
                                   bulkpublish API will be used for publishing the entries

  --content-types=content-types    The Content-Types from which entries need to be published

  --retry-failed=retry-failed      Retry publishing failed entries from the logfile

  --source-env=source-env          Source Environment

DESCRIPTION
  The nonlocalized-field-changes command is used for publishing nonlocalized field changes from the given Content Types
  to the specified Environments

  Content Types, Environments and Source Environment are required for executing this command successfully.
  But, if retryFailed flag is set, then only a logfile is required

ALIASES
  $ csdx cm:bulk-publish:nonlocalized-field-changes

EXAMPLES
  General Usage
  csdx cm:entries:publish-non-localized-fields --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] --environments
  [ENVIRONMENT 1] [ENVIRONMENT 2] --alias [MANAGEMENT TOKEN ALIAS] --source-env [SOURCE ENV]

  Using --config or -c flag
  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`
  csdx cm:entries:publish-non-localized-fields --config [PATH TO CONFIG FILE]
  csdx cm:entries:publish-non-localized-fields -c [PATH TO CONFIG FILE]

  Using --retry-failed flag
  csdx cm:entries:publish-non-localized-fields --retry-failed [LOG FILE NAME]

  Using --branch flag
  csdx cm:entries:publish-non-localized-fields --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] --environments
  [ENVIRONMENT 1] [ENVIRONMENT 2] --alias [MANAGEMENT TOKEN ALIAS] --source-env [SOURCE ENV] --branch [BRANCH NAME]
```

_See code: [src/commands/cm/entries/publish-non-localized-fields.js](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/entries/publish-non-localized-fields.js)_

## `csdx cm:entries:unpublish`

Unpublish entries from given environment

```
USAGE
  $ csdx cm:entries:unpublish

OPTIONS
  -a, --alias=alias                Alias for the management token to be used
  -c, --config=config              Path to config file to be used
  -e, --environment=environment    Source Environment
  -y, --yes                        Agree to process the command with the current configuration
  --branch=branch                  [default: main] Specify the branch to fetch the content from (default is main branch)

  --bulk-unpublish=bulk-unpublish  [default: true] This flag is set to true by default. It indicates that contentstack's
                                   bulkpublish API will be used for publishing the entries

  --content-type=content-type      Content Type filter

  --delivery-token=delivery-token  Delivery Token for source environment

  --locale=locale                  Locale filter

  --retry-failed=retry-failed      Retry publishing failed entries from the logfile

DESCRIPTION
  The unpublish command is used for unpublishing entries from given environment

  Environment (Source Environment) and Locale are required for executing the command successfully
  But, if retry-failed flag is set, then only a logfile is required

EXAMPLES
  General Usage
  csdx cm:stacks:unpublish --bulk-unpublish --content-type [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE]
  --alias [MANAGEMENT TOKEN ALIAS] --delivery-token [DELIVERY TOKEN]

  Using --config or -c flag
  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure --alias [ALIAS]`
  csdx cm:stacks:unpublish --config [PATH TO CONFIG FILE]
  csdx cm:stacks:unpublish -c [PATH TO CONFIG FILE]

  Using --retry-failed flag
  csdx cm:stacks:unpublish --retry-failed [LOG FILE NAME]


  Using --branch flag
  csdx cm:stacks:unpublish --bulk-unpublish --content-type [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE]
  --alias [MANAGEMENT TOKEN ALIAS] --delivery-token [DELIVERY TOKEN] --branch [BRANCH NAME]
```

_See code: [src/commands/cm/entries/unpublish.js](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/entries/unpublish.js)_

## `csdx cm:entries:update-and-publish`

Add fields from updated content types to their respective entries

```
USAGE
  $ csdx cm:entries:update-and-publish

OPTIONS
  -B, --branch=branch              [default: main] Specify the branch to fetch the content from (default is main branch)
  -a, --alias=alias                Alias for the management token to be used
  -c, --config=config              Path to config file to be used
  -e, --environments=environments  Environments to which entries need to be published
  -l, --locales=locales            Locales to which entries need to be published
  -t, --contentTypes=contentTypes  The Content-Types from which entries need to be published
  -y, --yes                        Agree to process the command with the current configuration

  --bulk-publish=bulk-publish      [default: true] This flag is set to true by default. It indicates that contentstack's
                                   bulkpublish API will be used for publishing the entries

  --content-type=content-type      The Content-Types from which entries need to be published

  --retry-failed=retry-failed      Retry publishing failed entries from the logfile (optional, overrides all other
                                   flags)

DESCRIPTION
  The add-fields command is used for updating already existing entries with the updated schema of their respective
  Content Type

  Content Types, Environments and Locales are required for executing the command successfully
  But, if retry-failed flag is set, then only a logfile is required

ALIASES
  $ csdx cm:bulk-publish:add-fields

EXAMPLES
  General Usage
  csdx cm:entries:update-and-publish --content-type [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2]
   --locale [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]

  Using --config or -c flag
  Generate a config file at the current working directory using `csdx cm:stacks:publish-configure -a [ALIAS]`
  csdx cm:entries:update-and-publish --config [PATH TO CONFIG FILE]
  csdx cm:entries:update-and-publish -c [PATH TO CONFIG FILE]

  Using --retry-failed
  csdx cm:entries:update-and-publish --retry-failed [LOG FILE NAME]

  Using --branch
  csdx cm:entries:update-and-publish --content-type [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2]
   --locale [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS] --branch [BRANCH NAME]
```

_See code: [src/commands/cm/entries/update-and-publish.js](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/entries/update-and-publish.js)_

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

## `csdx cm:stacks:publish-revert`

Revert publish operations by using a log file

```
USAGE
  $ csdx cm:stacks:publish-revert

OPTIONS
  --log-file=log-file          logfile to be used to revert
  --retry-failed=retry-failed  retry publishing failed entries from the logfile

DESCRIPTION
  The revert command is used for reverting all publish operations performed using bulk-publish script.
  A log file name is required to execute revert command

ALIASES
  $ csdx cm:bulk-publish:revert

EXAMPLES
  Using --log-file
  cm:bulk-publish:revert --log-file [LOG FILE NAME]

  Using --retry-failed
  cm:bulk-publish:revert --retry-failed [LOG FILE NAME]
```

_See code: [src/commands/cm/stacks/publish-revert.js](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/stacks/publish-revert.js)_

## `csdx cm:stacks:unpublish`

Unpublish entries or assets of given Content Types from given environment

```
USAGE
  $ csdx cm:stacks:unpublish

OPTIONS
  -a, --alias=alias                Alias for the management token to be used
  -c, --config=config              Path to config file to be used
  -e, --environment=environment    Source Environment
  -y, --yes                        Agree to process the command with the current configuration
  --locale=locale                  Locale filter

  --branch=branch                  [default: main] Specify the branch to fetch the content from (default is main branch)

  --bulk-unpublish=bulk-unpublish  [default: true] This flag is set to true by default. It indicates that contentstack's
                                   bulkpublish API will be used for publishing the entries

  --content-type=content-type      Content Type filter

  --delivery-token=delivery-token  Delivery Token for source environment

  --retry-failed=retry-failed      Retry publishing failed entries from the logfile

DESCRIPTION
  The unpublish command is used for unpublishing entries or assets from given environment

  Environment (Source Environment) and Locale are required for executing the command successfully
  But, if retry-failed flag is set, then only a logfile is required

  A Content Type can be specified for unpublishing entries, but if no content-type(s) is/are specified and --only-assets
   is not used,
  then all entries from all content types will be unpublished from the source environment

  --only-assets can be used to unpublish only assets and --only-entries can be used to unpublish only entries.
  (--only-assets and --only-entries cannot be used together at the same time)

ALIASES
  $ csdx cm:bulk-publish:unpublish

EXAMPLES
  General Usage
  csdx cm:stacks:unpublish --bulk-unpublish --content-type [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE]
  --alias [MANAGEMENT TOKEN ALIAS] ----delivery-token [DELIVERY TOKEN]

  Using --config or -c flag
  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure --alias [ALIAS]`
  csdx cm:stacks:unpublish --config [PATH TO CONFIG FILE]
  csdx cm:stacks:unpublish -c [PATH TO CONFIG FILE]

  Using --retry-failed flag
  csdx cm:stacks:unpublish --retry-failed [LOG FILE NAME]

  No content type
  csdx cm:stacks:unpublish --environment [SOURCE ENV] --locale [LOCALE] (Will unpublish all entries from all content
  types and assets from the source environment)

  Using --only-assets
  csdx cm:stacks:unpublish --environment [SOURCE ENV] --locale [LOCALE] --only-assets (Will unpublish only assets from
  the source environment)

  Using --only-entries
  csdx cm:stacks:unpublish --environment [SOURCE ENV] --locale [LOCALE] --only-entries (Will unpublish only entries, all
   entries, from the source environment)
  csdx cm:stacks:unpublish --contentType [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE] --only-entries
  (Will unpublish only entries, (from CONTENT TYPE) from the source environment)

  Using --branch flag
  csdx cm:stacks:unpublish --bulk-unpublish --content-type [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE]
  --alias [MANAGEMENT TOKEN ALIAS] --delivery-token [DELIVERY TOKEN] --branch [BRANCH NAME]
```

_See code: [src/commands/cm/stacks/unpublish.js](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/stacks/unpublish.js)_

<!-- commandsstop -->
