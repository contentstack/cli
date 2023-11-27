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
$ csdx (--version)
@contentstack/cli-cm-bulk-publish/1.3.16 darwin-arm64 node-v20.8.0
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`csdx cm:assets:publish [-a <value>] [--retry-failed <value>] [-e <value>] [--folder-uid <value>] [--bulk-publish <value>] [-c <value>] [-y] [--locales <value>] [--branch <value>] [--delivery-token <value>] [--source-env <value>]`](#csdx-cmassetspublish--a-value---retry-failed-value--e-value---folder-uid-value---bulk-publish-value--c-value--y---locales-value---branch-value---delivery-token-value---source-env-value)
* [`csdx cm:assets:unpublish`](#csdx-cmassetsunpublish)
* [`csdx cm:bulk-publish`](#csdx-cmbulk-publish)
* [`csdx cm:entries:update-and-publish [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--content-types <value>] [-t <value>] [-e <value>] [-c <value>] [-y] [--locales <value>] [--branch <value>]`](#csdx-cmentriesupdate-and-publish--a-value---retry-failed-value---bulk-publish-value---content-types-value--t-value--e-value--c-value--y---locales-value---branch-value)
* [`csdx cm:assets:publish [-a <value>] [--retry-failed <value>] [-e <value>] [--folder-uid <value>] [--bulk-publish <value>] [-c <value>] [-y] [--locales <value>] [--branch <value>] [--delivery-token <value>] [--source-env <value>]`](#csdx-cmassetspublish--a-value---retry-failed-value--e-value---folder-uid-value---bulk-publish-value--c-value--y---locales-value---branch-value---delivery-token-value---source-env-value-1)
* [`csdx cm:bulk-publish:clear`](#csdx-cmbulk-publishclear)
* [`csdx cm:bulk-publish:configure`](#csdx-cmbulk-publishconfigure)
* [`csdx cm:bulk-publish:cross-publish [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--content-type <value>] [--locales <value>] [--source-env <value>] [--environments <value>] [--delivery-token <value>] [-c <value>] [-y] [--branch <value>] [--onlyAssets] [--onlyEntries]`](#csdx-cmbulk-publishcross-publish--a-value---retry-failed-value---bulk-publish-value---content-type-value---locales-value---source-env-value---environments-value---delivery-token-value--c-value--y---branch-value---onlyassets---onlyentries)
* [`csdx cm:entries:publish [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--publish-all-content-types] [--content-types <value>] [--locales <value>] [-e <value>] [-c <value>] [-y] [--branch <value>] [--delivery-token <value>] [--source-env <value>]`](#csdx-cmentriespublish--a-value---retry-failed-value---bulk-publish-value---publish-all-content-types---content-types-value---locales-value--e-value--c-value--y---branch-value---delivery-token-value---source-env-value)
* [`csdx cm:entries:publish-modified [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--source-env <value>] [--content-types <value>] [--locales <value>] [-e <value>] [-c <value>] [-y] [--branch <value>]`](#csdx-cmentriespublish-modified--a-value---retry-failed-value---bulk-publish-value---source-env-value---content-types-value---locales-value--e-value--c-value--y---branch-value)
* [`csdx cm:entries:publish-non-localized-fields [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--source-env <value>] [--content-types <value>] [-e <value>] [-c <value>] [-y] [--branch <value>]`](#csdx-cmentriespublish-non-localized-fields--a-value---retry-failed-value---bulk-publish-value---source-env-value---content-types-value--e-value--c-value--y---branch-value)
* [`csdx cm:bulk-publish:revert`](#csdx-cmbulk-publishrevert)
* [`csdx csdx cm:stacks:unpublish [-a <value>] [-e <value>] [-c <value>] [-y] [--locale <value>] [--branch <value>] [--retry-failed <value>] [--bulk-unpublish <value>] [--content-type <value>] [--delivery-token <value>] [--only-assets] [--only-entries]`](#csdx-csdx-cmstacksunpublish--a-value--e-value--c-value--y---locale-value---branch-value---retry-failed-value---bulk-unpublish-value---content-type-value---delivery-token-value---only-assets---only-entries)
* [`csdx cm:entries:publish-only-unpublished [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--source-env <value>] [--content-types <value>] [--locales <value>] [-e <value>] [-c <value>] [-y] [--branch <value>]`](#csdx-cmentriespublish-only-unpublished--a-value---retry-failed-value---bulk-publish-value---source-env-value---content-types-value---locales-value--e-value--c-value--y---branch-value)
* [`csdx cm:entries:publish [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--publish-all-content-types] [--content-types <value>] [--locales <value>] [-e <value>] [-c <value>] [-y] [--branch <value>] [--delivery-token <value>] [--source-env <value>]`](#csdx-cmentriespublish--a-value---retry-failed-value---bulk-publish-value---publish-all-content-types---content-types-value---locales-value--e-value--c-value--y---branch-value---delivery-token-value---source-env-value-1)
* [`csdx cm:entries:publish-modified [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--source-env <value>] [--content-types <value>] [--locales <value>] [-e <value>] [-c <value>] [-y] [--branch <value>]`](#csdx-cmentriespublish-modified--a-value---retry-failed-value---bulk-publish-value---source-env-value---content-types-value---locales-value--e-value--c-value--y---branch-value-1)
* [`csdx cm:entries:publish-non-localized-fields [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--source-env <value>] [--content-types <value>] [-e <value>] [-c <value>] [-y] [--branch <value>]`](#csdx-cmentriespublish-non-localized-fields--a-value---retry-failed-value---bulk-publish-value---source-env-value---content-types-value--e-value--c-value--y---branch-value-1)
* [`csdx cm:entries:publish-only-unpublished [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--source-env <value>] [--content-types <value>] [--locales <value>] [-e <value>] [-c <value>] [-y] [--branch <value>]`](#csdx-cmentriespublish-only-unpublished--a-value---retry-failed-value---bulk-publish-value---source-env-value---content-types-value---locales-value--e-value--c-value--y---branch-value-1)
* [`csdx cm:entries:unpublish`](#csdx-cmentriesunpublish)
* [`csdx cm:entries:update-and-publish [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--content-types <value>] [-t <value>] [-e <value>] [-c <value>] [-y] [--locales <value>] [--branch <value>]`](#csdx-cmentriesupdate-and-publish--a-value---retry-failed-value---bulk-publish-value---content-types-value--t-value--e-value--c-value--y---locales-value---branch-value-1)
* [`csdx cm:stacks:publish`](#csdx-cmstackspublish)
* [`csdx cm:stacks:publish-clear-logs`](#csdx-cmstackspublish-clear-logs)
* [`csdx cm:stacks:publish-configure`](#csdx-cmstackspublish-configure)
* [`csdx cm:stacks:publish-revert`](#csdx-cmstackspublish-revert)
* [`csdx csdx cm:stacks:unpublish [-a <value>] [-e <value>] [-c <value>] [-y] [--locale <value>] [--branch <value>] [--retry-failed <value>] [--bulk-unpublish <value>] [--content-type <value>] [--delivery-token <value>] [--only-assets] [--only-entries]`](#csdx-csdx-cmstacksunpublish--a-value--e-value--c-value--y---locale-value---branch-value---retry-failed-value---bulk-unpublish-value---content-type-value---delivery-token-value---only-assets---only-entries-1)

## `csdx cm:assets:publish [-a <value>] [--retry-failed <value>] [-e <value>] [--folder-uid <value>] [--bulk-publish <value>] [-c <value>] [-y] [--locales <value>] [--branch <value>] [--delivery-token <value>] [--source-env <value>]`

Publish assets to the specified environments

```
USAGE
  $ csdx cm:assets:publish [-a <value>] [--retry-failed <value>] [-e <value>] [--folder-uid <value>] [--bulk-publish
    <value>] [-c <value>] [-y] [--locales <value>] [--branch <value>] [--delivery-token <value>] [--source-env <value>]

FLAGS
  -B, --branch=<value>           [default: main] Specify the branch to fetch the content (by default the main branch is
                                 selected)
  -a, --alias=<value>            Alias(name) for the management token
  -c, --config=<value>           Path to the config file
  -e, --environments=<value>...  Environments where assets will be published
  -k, --stack-api-key=<value>    Stack api key to be used
  -l, --locales=<value>...       Locales to where assets will be published
  -y, --yes                      Agree to process the command with the current configuration
  --api-version=<value>          API Version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].
  --bulk-publish=<value>         [default: true] By default this flag is set as true. It indicates that contentstack's
                                 bulkpublish API will be used to publish the assets
  --delivery-token=<value>       Delivery token for source environment
  --folder-uid=<value>           [default: cs_root] Folder-uid from where the assets will be published
  --retry-failed=<value>         Retry publishing failed assets from the logfile (optional, will override all other
                                 flags)
  --source-env=<value>           Source environment

DESCRIPTION
  Publish assets to the specified environments
  The assets command is used to publish assets from the specified stack, to the specified environments

  Note: Environment(s) and Locale(s) are required to execute the command successfully
  But, if retryFailed flag is set, then only a logfile is required


ALIASES
  $ csdx cm:bulk-publish:assets

EXAMPLES
  General Usage

  $ csdx cm:assets:publish --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE] --alias [MANAGEMENT TOKEN ALIAS]



  Using --config or -c flag

  Generate a config file at the current working directory using `csdx cm:stacks:publish-configure -a [ALIAS]`

  $ csdx cm:assets:publish --config [PATH TO CONFIG FILE]

  $ csdx cm:assets:publish -c [PATH TO CONFIG FILE]



  Using --retry-failed flag

  $ csdx cm:assets:publish --retry-failed [LOG FILE NAME]



  Using --branch flag

  $ csdx cm:assets:publish --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE] --alias [MANAGEMENT TOKEN ALIAS] --branch [BRANCH NAME]



  Using --source-env

  $ csdx cm:assets:publish --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE] --alias [MANAGEMENT TOKEN ALIAS] --source-env [SOURCE ENVIRONMENT] --delivery-token [DELIVERY TOKEN]



  Using --stack-api-key flag

  $ csdx cm:assets:publish --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE] --stack-api-key [STACK API KEY]
```

_See code: [src/commands/cm/assets/publish.js](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/assets/publish.js)_

## `csdx cm:assets:unpublish`

Unpublish assets from given environment

```
USAGE
  $ csdx cm:assets:unpublish [-a <value>] [-k <value>] [-e <value>] [-c <value>] [-y] [--locale <value>] [--branch
    <value>] [--retry-failed <value>] [--bulk-unpublish <value>] [--api-version <value>] [--delivery-token <value>]

FLAGS
  -a, --alias=<value>          Alias(name) for the management token
  -c, --config=<value>         Path to the config file
  -e, --environment=<value>    Source Environment
  -k, --stack-api-key=<value>  Stack api key to be used
  -y, --yes                    Agree to process the command with the current configuration
  --api-version=<value>        API Version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].
  --branch=<value>             [default: main] Specify the branch to fetch the content (by default the main branch is
                               selected)
  --bulk-unpublish=<value>     [default: true] By default this flag is set as true. It indicates that contentstack's
                               bulkpublish API will be used to unpublish the assets
  --delivery-token=<value>     Delivery Token for source environment
  --locale=<value>             Locale filter
  --retry-failed=<value>       Retry unpublishing failed assets from the logfile

DESCRIPTION
  Unpublish assets from given environment
  The unpublish command is used for unpublishing assets from the given environment

  Note: Environment (Source Environment) and Locale are required to execute the command successfully
  But, if retry-failed flag is set, then only a logfile is required

EXAMPLES
  General Usage

  $ csdx cm:assets:unpublish --bulk-unpublish --environment [SOURCE ENV] --locale [LOCALE] --alias [MANAGEMENT TOKEN ALIAS] --delivery-token [DELIVERY TOKEN]



  Using --config or -c flag

  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure --alias [ALIAS]`

  $ csdx cm:assets:unpublish --config [PATH TO CONFIG FILE]

  $ csdx cm:assets:unpublish -c [PATH TO CONFIG FILE]



  Using --retry-failed flag

  $ csdx cm:assets:unpublish --retry-failed [LOG FILE NAME]



  Using --branch flag

  $ csdx cm:assets:unpublish --bulk-unpublish --environment [SOURCE ENV] --locale [LOCALE] --alias [MANAGEMENT TOKEN ALIAS] --delivery-token [DELIVERY TOKEN] --branch [BRANCH NAME]



  Using --stack-api-key flag

  $ csdx cm:assets:unpublish --bulk-unpublish --environment [SOURCE ENV] --locale [LOCALE] --stack-api-key [STACK API KEY] --delivery-token [DELIVERY TOKEN]
```

_See code: [src/commands/cm/assets/unpublish.js](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/assets/unpublish.js)_

## `csdx cm:bulk-publish`

Bulk Publish script for managing entries and assets

```
USAGE
  $ csdx cm:bulk-publish

DESCRIPTION
  Bulk Publish script for managing entries and assets
```

_See code: [src/commands/cm/bulk-publish/index.js](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/index.js)_

## `csdx cm:entries:update-and-publish [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--content-types <value>] [-t <value>] [-e <value>] [-c <value>] [-y] [--locales <value>] [--branch <value>]`

Add fields from updated content types to their respective entries

```
USAGE
  $ csdx cm:entries:update-and-publish [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--content-types
    <value>] [-t <value>] [-e <value>] [-c <value>] [-y] [--locales <value>] [--branch <value>]

FLAGS
  -B, --branch=<value>           [default: main] Specify the branch to fetch the content (by default the main branch is
                                 selected)
  -a, --alias=<value>            Alias(name) for the management token
  -c, --config=<value>           Path to the config file
  -e, --environments=<value>...  Environments where entries will be published
  -k, --stack-api-key=<value>    Stack api key to be used
  -l, --locales=<value>...       Locales where entries will be published
  -t, --contentTypes=<value>...  The Contenttypes from which entries will be published
  -y, --yes                      Agree to process the command with the current configuration
  --api-version=<value>          API Version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].
  --bulk-publish=<value>         [default: true] This flag is set to true by default. It indicates that contentstack's
                                 bulkpublish API will be used to publish the entries
  --content-types=<value>...     The Contenttypes from which entries will be published
  --force                        Update and publish all entries even if no fields have been added
  --retry-failed=<value>         Retry publishing failed entries from the logfile (optional, overrides all other flags)

DESCRIPTION
  Add fields from updated content types to their respective entries
  The update-and-publish command is used to update existing entries with the updated schema of the respective content
  type

  Note: Content types, Environments and Locales are required to execute the command successfully
  But, if retry-failed flag is set, then only a logfile is required


ALIASES
  $ csdx cm:bulk-publish:add-fields

EXAMPLES
  General Usage

  $ csdx cm:entries:update-and-publish --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]



  Using --config or -c flag

  Generate a config file at the current working directory using `csdx cm:stacks:publish-configure -a [ALIAS]`

  $ csdx cm:entries:update-and-publish --config [PATH TO CONFIG FILE]

  $ csdx cm:entries:update-and-publish -c [PATH TO CONFIG FILE]



  Using --retry-failed

  $ csdx cm:entries:update-and-publish --retry-failed [LOG FILE NAME]



  Using --branch

  $ csdx cm:entries:update-and-publish --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS] --branch [BRANCH NAME]



  Using --stack-api-key

  $ csdx cm:entries:update-and-publish --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] --stack-api-key [STACK API KEY]
```

## `csdx cm:assets:publish [-a <value>] [--retry-failed <value>] [-e <value>] [--folder-uid <value>] [--bulk-publish <value>] [-c <value>] [-y] [--locales <value>] [--branch <value>] [--delivery-token <value>] [--source-env <value>]`

Publish assets to the specified environments

```
USAGE
  $ csdx cm:assets:publish [-a <value>] [--retry-failed <value>] [-e <value>] [--folder-uid <value>] [--bulk-publish
    <value>] [-c <value>] [-y] [--locales <value>] [--branch <value>] [--delivery-token <value>] [--source-env <value>]

FLAGS
  -B, --branch=<value>           [default: main] Specify the branch to fetch the content (by default the main branch is
                                 selected)
  -a, --alias=<value>            Alias(name) for the management token
  -c, --config=<value>           Path to the config file
  -e, --environments=<value>...  Environments where assets will be published
  -k, --stack-api-key=<value>    Stack api key to be used
  -l, --locales=<value>...       Locales to where assets will be published
  -y, --yes                      Agree to process the command with the current configuration
  --api-version=<value>          API Version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].
  --bulk-publish=<value>         [default: true] By default this flag is set as true. It indicates that contentstack's
                                 bulkpublish API will be used to publish the assets
  --delivery-token=<value>       Delivery token for source environment
  --folder-uid=<value>           [default: cs_root] Folder-uid from where the assets will be published
  --retry-failed=<value>         Retry publishing failed assets from the logfile (optional, will override all other
                                 flags)
  --source-env=<value>           Source environment

DESCRIPTION
  Publish assets to the specified environments
  The assets command is used to publish assets from the specified stack, to the specified environments

  Note: Environment(s) and Locale(s) are required to execute the command successfully
  But, if retryFailed flag is set, then only a logfile is required


ALIASES
  $ csdx cm:bulk-publish:assets

EXAMPLES
  General Usage

  $ csdx cm:assets:publish --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE] --alias [MANAGEMENT TOKEN ALIAS]



  Using --config or -c flag

  Generate a config file at the current working directory using `csdx cm:stacks:publish-configure -a [ALIAS]`

  $ csdx cm:assets:publish --config [PATH TO CONFIG FILE]

  $ csdx cm:assets:publish -c [PATH TO CONFIG FILE]



  Using --retry-failed flag

  $ csdx cm:assets:publish --retry-failed [LOG FILE NAME]



  Using --branch flag

  $ csdx cm:assets:publish --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE] --alias [MANAGEMENT TOKEN ALIAS] --branch [BRANCH NAME]



  Using --source-env

  $ csdx cm:assets:publish --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE] --alias [MANAGEMENT TOKEN ALIAS] --source-env [SOURCE ENVIRONMENT] --delivery-token [DELIVERY TOKEN]



  Using --stack-api-key flag

  $ csdx cm:assets:publish --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE] --stack-api-key [STACK API KEY]
```

## `csdx cm:bulk-publish:clear`

Clear the log folder

```
USAGE
  $ csdx cm:bulk-publish:clear [--log-files-count] [-y]

FLAGS
  -y, --yes          Delete all files without asking for confirmation
  --log-files-count  List number of log files

DESCRIPTION
  Clear the log folder

ALIASES
  $ csdx cm:bulk-publish:clear

EXAMPLES
  $ csdx cm:stacks:publish-clear-logs

  $ csdx cm:stacks:publish-clear-logs --log-files-count

  $ csdx cm:stacks:publish-clear-logs --yes

  $ csdx cm:stacks:publish-clear-logs -y
```

## `csdx cm:bulk-publish:configure`

The configure command is used to generate a configuration file for publish scripts.

```
USAGE
  $ csdx cm:bulk-publish:configure [-a <value>] [-k <value>]

FLAGS
  -a, --alias=<value>          Alias(name) for the management token
  -k, --stack-api-key=<value>  Stack api key to be used

DESCRIPTION
  The configure command is used to generate a configuration file for publish scripts.

ALIASES
  $ csdx cm:bulk-publish:configure

EXAMPLES
  $ csdx cm:stacks:publish-configure

  $ csdx cm:stacks:publish-configure -a <management_token_alias>

  $ csdx cm:stacks:publish-configure --alias <management_token_alias>

  $ csdx cm:stacks:publish-configure --stack-api-key <stack_api_key>
```

## `csdx cm:bulk-publish:cross-publish [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--content-type <value>] [--locales <value>] [--source-env <value>] [--environments <value>] [--delivery-token <value>] [-c <value>] [-y] [--branch <value>] [--onlyAssets] [--onlyEntries]`

Publish entries and assets from one environment to other environments

```
USAGE
  $ csdx cm:bulk-publish:cross-publish [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--content-type
    <value>] [--locales <value>] [--source-env <value>] [--environments <value>] [--delivery-token <value>] [-c <value>]
    [-y] [--branch <value>] [--onlyAssets] [--onlyEntries]

FLAGS
  -B, --branch=<value>         [default: main] Specify the branch to fetch the content (by default the main branch is
                               selected)
  -a, --alias=<value>          Alias(name) for the management token
  -c, --config=<value>         Path to the config file
  -k, --stack-api-key=<value>  Stack api key to be used
  -y, --yes                    Agree to process the command with the current configuration
  --api-version=<value>        API Version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].
  --bulk-publish=<value>       [default: true] This flag is set to true by default. It indicates that contentstack's
                               bulkpublish API will be used to publish the entries
  --content-type=<value>...    The Contenttypes from which entries will be published
  --delivery-token=<value>     Delivery token for source environment
  --environments=<value>...    Destination Environments
  --locales=<value>            Source locale
  --onlyAssets                 Unpublish only assets
  --onlyEntries                Unpublish only entries
  --retry-failed=<value>       (optional) Retry publishing failed entries from the logfile (this flag overrides all
                               other flags)
  --source-env=<value>         Source Env

DESCRIPTION
  Publish entries and assets from one environment to other environments
  The cross-publish command is used to publish entries and assets from one environment to other environments

  Note: Content Type, Environment, Destination Environment(s) and Locale are required to execute the command
  successfully
  But, if retryFailed flag is set, then only a logfile is required


EXAMPLES
  General Usage

  $ csdx cm:bulk-publish:cross-publish --content-type [CONTENT TYPE] --source-env [SOURCE ENV] --environments [DESTINATION ENVIRONMENT] --locales [LOCALE] -a [MANAGEMENT TOKEN ALIAS] --delivery-token [DELIVERY TOKEN]



  Using --config or -c flag

  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`

  $ csdx cm:bulk-publish:cross-publish --config [PATH TO CONFIG FILE]

  $ csdx cm:bulk-publish:cross-publish -c [PATH TO CONFIG FILE]



  Using --retry-failed flag

  $ csdx cm:bulk-publish:cross-publish --retry-failed [LOG FILE NAME]

  $ csdx cm:bulk-publish:cross-publish -r [LOG FILE NAME]



  Using --branch flag

  $ csdx cm:bulk-publish:cross-publish --content-type [CONTENT TYPE] --source-env [SOURCE ENV] --environments [DESTINATION ENVIRONMENT] --locales [LOCALE] -a [MANAGEMENT TOKEN ALIAS] --delivery-token [DELIVERY TOKEN] --branch [BRANCH NAME]



  Using --stack-api-key flag

  $ csdx cm:bulk-publish:cross-publish --content-type [CONTENT TYPE] --source-env [SOURCE ENV] --environments [DESTINATION ENVIRONMENT] --locales [LOCALE] --stack-api-key [STACK API KEY] --delivery-token [DELIVERY TOKEN]
```

_See code: [src/commands/cm/bulk-publish/cross-publish.js](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/cross-publish.js)_

## `csdx cm:entries:publish [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--publish-all-content-types] [--content-types <value>] [--locales <value>] [-e <value>] [-c <value>] [-y] [--branch <value>] [--delivery-token <value>] [--source-env <value>]`

Publish entries from multiple contenttypes to multiple environments and locales

```
USAGE
  $ csdx cm:entries:publish [-a <value>] [--retry-failed <value>] [--bulk-publish <value>]
    [--publish-all-content-types] [--content-types <value>] [--locales <value>] [-e <value>] [-c <value>] [-y] [--branch
    <value>] [--delivery-token <value>] [--source-env <value>]

FLAGS
  -B, --branch=<value>           [default: main] Specify the branch to fetch the content (by default the main branch is
                                 selected)
  -a, --alias=<value>            Alias(name) for the management token
  -c, --config=<value>           Path for the external config file (A new config file can be generated at the current
                                 working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`)
  -e, --environments=<value>...  Environments where entries will be published
  -k, --stack-api-key=<value>    Stack api key to be used
  -l, --locales=<value>...       Locales where entries will be published
  -y, --yes                      Agree to process the command with the current configuration
  --api-version=<value>          API Version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].
  --bulk-publish=<value>         [default: true] This flag is set to true by default. It indicates that contentstack's
                                 bulkpublish API will be used to publish the entries
  --content-types=<value>...     The Contenttypes from which entries need to be published
  --delivery-token=<value>       Delivery token for source environment
  --publish-all-content-types    (optional) Publish all contenttypes (cannot be set when contentTypes flag is set)
  --retry-failed=<value>         (optional) Retry failed entries from the logfile (overrides all other flags) This flag
                                 is used to retry publishing entries that failed to publish in a previous attempt. A log
                                 file for the previous session will be required for processing the failed entries
  --source-env=<value>           Source environment

DESCRIPTION
  Publish entries from multiple contenttypes to multiple environments and locales
  The publish command is used to publish entries from the specified content types, to the
  specified environments and locales

  Note: Content Types, Environments and Locales are required to execute the command successfully
  But, if retry-failed flag is set, then only a logfile is required


ALIASES
  $ csdx cm:bulk-publish:entries

EXAMPLES
  General Usage

  $ csdx cm:entries:publish --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]



  Using --config or -c flag

  Generate a config file at the current working directory using `csdx cm:stacks:publish-configure -a [ALIAS]`

  $ csdx cm:entries:publish --config [PATH TO CONFIG FILE]

  $ csdx cm:entries:publish -c [PATH TO CONFIG FILE]



  Using --retry-failed

  $ csdx cm:entries:publish --retry-failed [LOG FILE NAME]

  $ csdx cm:entries:publish -r [LOG FILE NAME]



  Using --branch

  $ csdx cm:entries:publish --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS] --branch [BRANCH NAME]



  Using --source-env

  $ csdx cm:entries:publish --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS] --source-env [SOURCE ENVIRONMENT] --delivery-token [DELIVERY TOKEN]



  Using --stack-api-key

  $ csdx cm:entries:publish -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] --stack-api-key [STACK API KEY] --source-env [SOURCE ENVIRONMENT] --delivery-token [DELIVERY TOKEN]
```

## `csdx cm:entries:publish-modified [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--source-env <value>] [--content-types <value>] [--locales <value>] [-e <value>] [-c <value>] [-y] [--branch <value>]`

Publish edited entries from a specified content type to the given locales and environments

```
USAGE
  $ csdx cm:entries:publish-modified [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--source-env
    <value>] [--content-types <value>] [--locales <value>] [-e <value>] [-c <value>] [-y] [--branch <value>]

FLAGS
  -B, --branch=<value>           [default: main] Specify the branch to fetch the content (by default the main branch is
                                 selected)
  -a, --alias=<value>            Alias(name) for the management token
  -c, --config=<value>           Path to the config file
  -e, --environments=<value>...  Destination environments
  -k, --stack-api-key=<value>    Stack api key to be used
  -l, --locales=<value>...       Locales where edited entries will be published
  -y, --yes                      Agree to process the command with the current configuration
  --api-version=<value>          API Version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].
  --bulk-publish=<value>         [default: true] This flag is set to true by default. It indicates that contentstack's
                                 bulkpublish API will be used to publish the entries
  --content-types=<value>...     The Contenttypes which will be checked for edited entries
  --retry-failed=<value>         Retry publishing failed entries from the logfile (optional, overrides all other flags)
  --source-env=<value>           Environment from which edited entries will be published

DESCRIPTION
  Publish edited entries from a specified content type to the given locales and environments
  The publish-modified command is used to publish entries from the specified content types, to the
  specified environments and locales

  Note: Content type(s), Source Environment, Destination Environment(s) and Locale(s) are required to execute the
  command successfully
  But, if retry-failed flag is set, then only a logfile is required


ALIASES
  $ csdx cm:bulk-publish:entry-edits

EXAMPLES
  General Usage

  $ csdx cm:entries:publish-modified --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] --source-env [SOURCE_ENV] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]



  Using --config or -c flag

  Generate a config file at the current working directory using `csdx cm:stacks:publish-configure -a [ALIAS]`

  $ csdx cm:entries:publish-modified --config [PATH TO CONFIG FILE]

  $ csdx cm:entries:publish-modified -c [PATH TO CONFIG FILE]



  Using --retry-failed

  $ csdx cm:entries:publish-modified --retry-failed [LOG FILE NAME]

  $ csdx cm:entries:publish-modified -r [LOG FILE NAME]



  Using --branch

  $ csdx cm:entries:publish-modified --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] --source-env [SOURCE_ENV] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS] --branch [BRANCH NAME]



  Using --stack-api-key

  $ csdx cm:entries:publish-modified --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] --source-env [SOURCE_ENV] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] -stack-api-key [STACK API KEY]
```

## `csdx cm:entries:publish-non-localized-fields [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--source-env <value>] [--content-types <value>] [-e <value>] [-c <value>] [-y] [--branch <value>]`

Publish non-localized fields for the given content types, from a particular source environment to the specified environments

```
USAGE
  $ csdx cm:entries:publish-non-localized-fields [-a <value>] [--retry-failed <value>] [--bulk-publish <value>]
    [--source-env <value>] [--content-types <value>] [-e <value>] [-c <value>] [-y] [--branch <value>]

FLAGS
  -B, --branch=<value>           [default: main] Specify the branch to fetch the content (by default the main branch is
                                 selected)
  -a, --alias=<value>            Alias(name) for the management token
  -c, --config=<value>           Path to the config file
  -e, --environments=<value>...  Destination environments
  -k, --stack-api-key=<value>    Stack api key to be used
  -y, --yes                      Agree to process the command with the current configuration
  --api-version=<value>          API Version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].
  --bulk-publish=<value>         [default: true] This flag is set to true by default. It indicates that contentstack's
                                 bulkpublish API will be used to publish the entries
  --content-types=<value>...     The Contenttypes from which entries will be published
  --retry-failed=<value>         Retry publishing failed entries from the logfile
  --source-env=<value>           Source Environment

DESCRIPTION
  Publish non-localized fields for the given content types, from a particular source environment to the specified
  environments
  The non-localized field changes command is used to publish non-localized field changes from the given content types to
  the specified environments

  Note: Content types, Environments and Source Environment are required to execute this command successfully.
  But, if retryFailed flag is set, then only a logfile is required

ALIASES
  $ csdx cm:bulk-publish:nonlocalized-field-changes

EXAMPLES
  General Usage

  $ csdx cm:entries:publish-non-localized-fields --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --alias [MANAGEMENT TOKEN ALIAS] --source-env [SOURCE ENV]



  Using --config or -c flag

  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`

  $ csdx cm:entries:publish-non-localized-fields --config [PATH TO CONFIG FILE]

  $ csdx cm:entries:publish-non-localized-fields -c [PATH TO CONFIG FILE]



  Using --retry-failed flag

  $ csdx cm:entries:publish-non-localized-fields --retry-failed [LOG FILE NAME]



  Using --branch flag

  $ csdx cm:entries:publish-non-localized-fields --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --alias [MANAGEMENT TOKEN ALIAS] --source-env [SOURCE ENV] --branch [BRANCH NAME]



  Using --stack-api-key flag

  $ csdx cm:entries:publish-non-localized-fields --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --stack-api-key [STACK API KEY] --source-env [SOURCE ENV]
```

## `csdx cm:bulk-publish:revert`

Revert publish operations by using a log file

```
USAGE
  $ csdx cm:bulk-publish:revert [--retry-failed <value>] [--log-file <value>]

FLAGS
  --log-file=<value>      logfile to be used to revert
  --retry-failed=<value>  retry publishing failed entries from the logfile

DESCRIPTION
  Revert publish operations by using a log file
  The revert command is used to revert all publish operations performed using bulk-publish script.
  A log file name is required to execute revert command


ALIASES
  $ csdx cm:bulk-publish:revert

EXAMPLES
  Using --log-file

  cm:bulk-publish:revert --log-file [LOG FILE NAME]



  Using --retry-failed

  cm:bulk-publish:revert --retry-failed [LOG FILE NAME]
```

## `csdx csdx cm:stacks:unpublish [-a <value>] [-e <value>] [-c <value>] [-y] [--locale <value>] [--branch <value>] [--retry-failed <value>] [--bulk-unpublish <value>] [--content-type <value>] [--delivery-token <value>] [--only-assets] [--only-entries]`

Unpublish entries or assets of given content types from the specified environment

```
USAGE
  $ csdx csdx cm:stacks:unpublish [-a <value>] [-e <value>] [-c <value>] [-y] [--locale <value>] [--branch <value>]
    [--retry-failed <value>] [--bulk-unpublish <value>] [--content-type <value>] [--delivery-token <value>]
    [--only-assets] [--only-entries]

FLAGS
  -B, --branch=<value>         [default: main] Specify the branch to fetch the content from (default is main branch)
  -a, --alias=<value>          Alias(name) for the management token
  -c, --config=<value>         Path to the config file
  -e, --environment=<value>    Source Environment
  -k, --stack-api-key=<value>  Stack api key to be used
  -l, --locale=<value>         Locale filter
  -y, --yes                    Agree to process the command with the current configuration
  --api-version=<value>        API Version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].
  --bulk-unpublish=<value>     [default: true] This flag is set to true by default. It indicates that contentstack's
                               bulkpublish API will be used to unpublish the entries and assets
  --content-type=<value>       Content type filter
  --delivery-token=<value>     Delivery token for source environment
  --retry-failed=<value>       Retry publishing failed entries from the logfile (optional, overrides all other flags)

DESCRIPTION
  Unpublish entries or assets of given content types from the specified environment
  The unpublish command is used to unpublish entries or assets from given environment

  Environment (Source Environment) and Locale are required to execute the command successfully
  But, if retry-failed flag is set, then only a logfile is required

  A content type can be specified for unpublishing entries, but if no content-type(s) is/are specified and --only-assets
  is not used,
  then all entries from all content types will be unpublished from the source environment

  Note: --only-assets can be used to unpublish only assets and --only-entries can be used to unpublish only entries.
  (--only-assets and --only-entries cannot be used together at the same time)


ALIASES
  $ csdx cm:bulk-publish:unpublish

EXAMPLES
  General Usage

  $ csdx cm:stacks:unpublish --bulk-unpublish --content-type [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE] --alias [MANAGEMENT TOKEN ALIAS] ----delivery-token [DELIVERY TOKEN]



  Using --config or -c flag

  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure --alias [ALIAS]`

  $ csdx cm:stacks:unpublish --config [PATH TO CONFIG FILE]

  $ csdx cm:stacks:unpublish -c [PATH TO CONFIG FILE]



  Using --retry-failed flag

  $ csdx cm:stacks:unpublish --retry-failed [LOG FILE NAME]



  No content type

  $ csdx cm:stacks:unpublish --environment [SOURCE ENV] --locale [LOCALE] (Will unpublish all entries from all content types and assets from the source environment)



  Using --only-assets

  $ csdx cm:stacks:unpublish --environment [SOURCE ENV] --locale [LOCALE] --only-assets (Will unpublish only assets from the source environment)



  Using --only-entries

  $ csdx cm:stacks:unpublish --environment [SOURCE ENV] --locale [LOCALE] --only-entries (Will unpublish only entries, all entries, from the source environment)

  $ csdx cm:stacks:unpublish --contentType [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE] --only-entries (Will unpublish only entries, (from CONTENT TYPE) from the source environment)



  Using --branch flag

  $ csdx cm:stacks:unpublish --bulk-unpublish --content-type [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE] --alias [MANAGEMENT TOKEN ALIAS] --delivery-token [DELIVERY TOKEN] --branch [BRANCH NAME]



  Using --stack-api-key flag

  $ csdx cm:stacks:unpublish --bulk-unpublish --content-type [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE] --stack-api-key [STACK API KEY] --delivery-token [DELIVERY TOKEN]
```

## `csdx cm:entries:publish-only-unpublished [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--source-env <value>] [--content-types <value>] [--locales <value>] [-e <value>] [-c <value>] [-y] [--branch <value>]`

Publish unpublished entries from the source environment, to other environments and locales

```
USAGE
  $ csdx cm:entries:publish-only-unpublished [-a <value>] [--retry-failed <value>] [--bulk-publish <value>]
    [--source-env <value>] [--content-types <value>] [--locales <value>] [-e <value>] [-c <value>] [-y] [--branch
    <value>]

FLAGS
  -B, --branch=<value>           [default: main] Specify the branch to fetch the content (by default the main branch is
                                 selected)
  -a, --alias=<value>            Alias(name) for the management token
  -b, --bulk-publish=<value>     [default: true] This flag is set to true by default. It indicates that contentstack's
                                 bulkpublish API will be used to publish the entries
  -c, --config=<value>           Path to the config file
  -e, --environments=<value>...  Destination environments
  -k, --stack-api-key=<value>    Stack api key to be used
  -y, --yes                      Agree to process the command with the current configuration
  --api-version=<value>          API Version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].
  --content-types=<value>...     The Contenttypes from which entries will be published
  --locales=<value>              Source locale
  --retry-failed=<value>         Retry publishing failed entries from the logfile
  --source-env=<value>           Source Env

DESCRIPTION
  Publish unpublished entries from the source environment, to other environments and locales
  The publish-only-unpublished command is used to publish unpublished entries from the source environment, to other
  environments and locales

  Note: Content type(s), Source Environment, Destination Environment(s) and Source Locale are required to execute the
  command successfully
  But, if retry-failed flag is set, then only a logfile is required


ALIASES
  $ csdx cm:bulk-publish:unpublished-entries

EXAMPLES
  General Usage

  $ csdx cm:entries:publish-only-unpublished -b --content-types [CONTENT TYPES] -e [ENVIRONMENTS] --locales LOCALE -a [MANAGEMENT TOKEN ALIAS] -source-env [SOURCE ENV]



  Using --config or -c flag

  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`

  $ csdx cm:entries:publish-only-unpublished --config [PATH TO CONFIG FILE]

  $ csdx cm:entries:publish-only-unpublished -c [PATH TO CONFIG FILE]



  Using --retry-failed

  $ csdx cm:entries:publish-only-unpublished --retry-failed [LOG FILE NAME]



  Using --branch

  $ csdx cm:entries:publish-only-unpublished -b --content-types [CONTENT TYPES] -e [ENVIRONMENTS] --locales LOCALE -a [MANAGEMENT TOKEN ALIAS] --branch [BRANCH NAME] -source-env [SOURCE ENV]



  Using --stack-api-key

  $ csdx cm:entries:publish-only-unpublished -b --content-types [CONTENT TYPES] -e [ENVIRONMENTS] --locales LOCALE -a [MANAGEMENT TOKEN ALIAS] --stack-api-key [STACK API KEY] -source-env [SOURCE ENV]
```

## `csdx cm:entries:publish [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--publish-all-content-types] [--content-types <value>] [--locales <value>] [-e <value>] [-c <value>] [-y] [--branch <value>] [--delivery-token <value>] [--source-env <value>]`

Publish entries from multiple contenttypes to multiple environments and locales

```
USAGE
  $ csdx cm:entries:publish [-a <value>] [--retry-failed <value>] [--bulk-publish <value>]
    [--publish-all-content-types] [--content-types <value>] [--locales <value>] [-e <value>] [-c <value>] [-y] [--branch
    <value>] [--delivery-token <value>] [--source-env <value>]

FLAGS
  -B, --branch=<value>           [default: main] Specify the branch to fetch the content (by default the main branch is
                                 selected)
  -a, --alias=<value>            Alias(name) for the management token
  -c, --config=<value>           Path for the external config file (A new config file can be generated at the current
                                 working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`)
  -e, --environments=<value>...  Environments where entries will be published
  -k, --stack-api-key=<value>    Stack api key to be used
  -l, --locales=<value>...       Locales where entries will be published
  -y, --yes                      Agree to process the command with the current configuration
  --api-version=<value>          API Version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].
  --bulk-publish=<value>         [default: true] This flag is set to true by default. It indicates that contentstack's
                                 bulkpublish API will be used to publish the entries
  --content-types=<value>...     The Contenttypes from which entries need to be published
  --delivery-token=<value>       Delivery token for source environment
  --publish-all-content-types    (optional) Publish all contenttypes (cannot be set when contentTypes flag is set)
  --retry-failed=<value>         (optional) Retry failed entries from the logfile (overrides all other flags) This flag
                                 is used to retry publishing entries that failed to publish in a previous attempt. A log
                                 file for the previous session will be required for processing the failed entries
  --source-env=<value>           Source environment

DESCRIPTION
  Publish entries from multiple contenttypes to multiple environments and locales
  The publish command is used to publish entries from the specified content types, to the
  specified environments and locales

  Note: Content Types, Environments and Locales are required to execute the command successfully
  But, if retry-failed flag is set, then only a logfile is required


ALIASES
  $ csdx cm:bulk-publish:entries

EXAMPLES
  General Usage

  $ csdx cm:entries:publish --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]



  Using --config or -c flag

  Generate a config file at the current working directory using `csdx cm:stacks:publish-configure -a [ALIAS]`

  $ csdx cm:entries:publish --config [PATH TO CONFIG FILE]

  $ csdx cm:entries:publish -c [PATH TO CONFIG FILE]



  Using --retry-failed

  $ csdx cm:entries:publish --retry-failed [LOG FILE NAME]

  $ csdx cm:entries:publish -r [LOG FILE NAME]



  Using --branch

  $ csdx cm:entries:publish --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS] --branch [BRANCH NAME]



  Using --source-env

  $ csdx cm:entries:publish --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS] --source-env [SOURCE ENVIRONMENT] --delivery-token [DELIVERY TOKEN]



  Using --stack-api-key

  $ csdx cm:entries:publish -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] --stack-api-key [STACK API KEY] --source-env [SOURCE ENVIRONMENT] --delivery-token [DELIVERY TOKEN]
```

_See code: [src/commands/cm/entries/publish.js](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/entries/publish.js)_

## `csdx cm:entries:publish-modified [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--source-env <value>] [--content-types <value>] [--locales <value>] [-e <value>] [-c <value>] [-y] [--branch <value>]`

Publish edited entries from a specified content type to the given locales and environments

```
USAGE
  $ csdx cm:entries:publish-modified [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--source-env
    <value>] [--content-types <value>] [--locales <value>] [-e <value>] [-c <value>] [-y] [--branch <value>]

FLAGS
  -B, --branch=<value>           [default: main] Specify the branch to fetch the content (by default the main branch is
                                 selected)
  -a, --alias=<value>            Alias(name) for the management token
  -c, --config=<value>           Path to the config file
  -e, --environments=<value>...  Destination environments
  -k, --stack-api-key=<value>    Stack api key to be used
  -l, --locales=<value>...       Locales where edited entries will be published
  -y, --yes                      Agree to process the command with the current configuration
  --api-version=<value>          API Version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].
  --bulk-publish=<value>         [default: true] This flag is set to true by default. It indicates that contentstack's
                                 bulkpublish API will be used to publish the entries
  --content-types=<value>...     The Contenttypes which will be checked for edited entries
  --retry-failed=<value>         Retry publishing failed entries from the logfile (optional, overrides all other flags)
  --source-env=<value>           Environment from which edited entries will be published

DESCRIPTION
  Publish edited entries from a specified content type to the given locales and environments
  The publish-modified command is used to publish entries from the specified content types, to the
  specified environments and locales

  Note: Content type(s), Source Environment, Destination Environment(s) and Locale(s) are required to execute the
  command successfully
  But, if retry-failed flag is set, then only a logfile is required


ALIASES
  $ csdx cm:bulk-publish:entry-edits

EXAMPLES
  General Usage

  $ csdx cm:entries:publish-modified --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] --source-env [SOURCE_ENV] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]



  Using --config or -c flag

  Generate a config file at the current working directory using `csdx cm:stacks:publish-configure -a [ALIAS]`

  $ csdx cm:entries:publish-modified --config [PATH TO CONFIG FILE]

  $ csdx cm:entries:publish-modified -c [PATH TO CONFIG FILE]



  Using --retry-failed

  $ csdx cm:entries:publish-modified --retry-failed [LOG FILE NAME]

  $ csdx cm:entries:publish-modified -r [LOG FILE NAME]



  Using --branch

  $ csdx cm:entries:publish-modified --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] --source-env [SOURCE_ENV] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS] --branch [BRANCH NAME]



  Using --stack-api-key

  $ csdx cm:entries:publish-modified --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] --source-env [SOURCE_ENV] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] -stack-api-key [STACK API KEY]
```

_See code: [src/commands/cm/entries/publish-modified.js](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/entries/publish-modified.js)_

## `csdx cm:entries:publish-non-localized-fields [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--source-env <value>] [--content-types <value>] [-e <value>] [-c <value>] [-y] [--branch <value>]`

Publish non-localized fields for the given content types, from a particular source environment to the specified environments

```
USAGE
  $ csdx cm:entries:publish-non-localized-fields [-a <value>] [--retry-failed <value>] [--bulk-publish <value>]
    [--source-env <value>] [--content-types <value>] [-e <value>] [-c <value>] [-y] [--branch <value>]

FLAGS
  -B, --branch=<value>           [default: main] Specify the branch to fetch the content (by default the main branch is
                                 selected)
  -a, --alias=<value>            Alias(name) for the management token
  -c, --config=<value>           Path to the config file
  -e, --environments=<value>...  Destination environments
  -k, --stack-api-key=<value>    Stack api key to be used
  -y, --yes                      Agree to process the command with the current configuration
  --api-version=<value>          API Version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].
  --bulk-publish=<value>         [default: true] This flag is set to true by default. It indicates that contentstack's
                                 bulkpublish API will be used to publish the entries
  --content-types=<value>...     The Contenttypes from which entries will be published
  --retry-failed=<value>         Retry publishing failed entries from the logfile
  --source-env=<value>           Source Environment

DESCRIPTION
  Publish non-localized fields for the given content types, from a particular source environment to the specified
  environments
  The non-localized field changes command is used to publish non-localized field changes from the given content types to
  the specified environments

  Note: Content types, Environments and Source Environment are required to execute this command successfully.
  But, if retryFailed flag is set, then only a logfile is required

ALIASES
  $ csdx cm:bulk-publish:nonlocalized-field-changes

EXAMPLES
  General Usage

  $ csdx cm:entries:publish-non-localized-fields --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --alias [MANAGEMENT TOKEN ALIAS] --source-env [SOURCE ENV]



  Using --config or -c flag

  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`

  $ csdx cm:entries:publish-non-localized-fields --config [PATH TO CONFIG FILE]

  $ csdx cm:entries:publish-non-localized-fields -c [PATH TO CONFIG FILE]



  Using --retry-failed flag

  $ csdx cm:entries:publish-non-localized-fields --retry-failed [LOG FILE NAME]



  Using --branch flag

  $ csdx cm:entries:publish-non-localized-fields --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --alias [MANAGEMENT TOKEN ALIAS] --source-env [SOURCE ENV] --branch [BRANCH NAME]



  Using --stack-api-key flag

  $ csdx cm:entries:publish-non-localized-fields --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --stack-api-key [STACK API KEY] --source-env [SOURCE ENV]
```

_See code: [src/commands/cm/entries/publish-non-localized-fields.js](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/entries/publish-non-localized-fields.js)_

## `csdx cm:entries:publish-only-unpublished [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--source-env <value>] [--content-types <value>] [--locales <value>] [-e <value>] [-c <value>] [-y] [--branch <value>]`

Publish unpublished entries from the source environment, to other environments and locales

```
USAGE
  $ csdx cm:entries:publish-only-unpublished [-a <value>] [--retry-failed <value>] [--bulk-publish <value>]
    [--source-env <value>] [--content-types <value>] [--locales <value>] [-e <value>] [-c <value>] [-y] [--branch
    <value>]

FLAGS
  -B, --branch=<value>           [default: main] Specify the branch to fetch the content (by default the main branch is
                                 selected)
  -a, --alias=<value>            Alias(name) for the management token
  -b, --bulk-publish=<value>     [default: true] This flag is set to true by default. It indicates that contentstack's
                                 bulkpublish API will be used to publish the entries
  -c, --config=<value>           Path to the config file
  -e, --environments=<value>...  Destination environments
  -k, --stack-api-key=<value>    Stack api key to be used
  -y, --yes                      Agree to process the command with the current configuration
  --api-version=<value>          API Version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].
  --content-types=<value>...     The Contenttypes from which entries will be published
  --locales=<value>              Source locale
  --retry-failed=<value>         Retry publishing failed entries from the logfile
  --source-env=<value>           Source Env

DESCRIPTION
  Publish unpublished entries from the source environment, to other environments and locales
  The publish-only-unpublished command is used to publish unpublished entries from the source environment, to other
  environments and locales

  Note: Content type(s), Source Environment, Destination Environment(s) and Source Locale are required to execute the
  command successfully
  But, if retry-failed flag is set, then only a logfile is required


ALIASES
  $ csdx cm:bulk-publish:unpublished-entries

EXAMPLES
  General Usage

  $ csdx cm:entries:publish-only-unpublished -b --content-types [CONTENT TYPES] -e [ENVIRONMENTS] --locales LOCALE -a [MANAGEMENT TOKEN ALIAS] -source-env [SOURCE ENV]



  Using --config or -c flag

  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`

  $ csdx cm:entries:publish-only-unpublished --config [PATH TO CONFIG FILE]

  $ csdx cm:entries:publish-only-unpublished -c [PATH TO CONFIG FILE]



  Using --retry-failed

  $ csdx cm:entries:publish-only-unpublished --retry-failed [LOG FILE NAME]



  Using --branch

  $ csdx cm:entries:publish-only-unpublished -b --content-types [CONTENT TYPES] -e [ENVIRONMENTS] --locales LOCALE -a [MANAGEMENT TOKEN ALIAS] --branch [BRANCH NAME] -source-env [SOURCE ENV]



  Using --stack-api-key

  $ csdx cm:entries:publish-only-unpublished -b --content-types [CONTENT TYPES] -e [ENVIRONMENTS] --locales LOCALE -a [MANAGEMENT TOKEN ALIAS] --stack-api-key [STACK API KEY] -source-env [SOURCE ENV]
```

_See code: [src/commands/cm/entries/publish-only-unpublished.js](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/entries/publish-only-unpublished.js)_

## `csdx cm:entries:unpublish`

Unpublish entries from the given environment

```
USAGE
  $ csdx cm:entries:unpublish [-a <value>] [-k <value>] [-e <value>] [-c <value>] [-y] [--locale <value>] [--branch
    <value>] [--retry-failed <value>] [--bulk-unpublish <value>] [--api-version <value>] [--content-type <value>]
    [--delivery-token <value>]

FLAGS
  -a, --alias=<value>          Alias(name) for the management token
  -c, --config=<value>         Path to the config file
  -e, --environment=<value>    Source Environment
  -k, --stack-api-key=<value>  Stack api key to be used
  -y, --yes                    Agree to process the command with the current configuration
  --api-version=<value>        API Version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].
  --branch=<value>             [default: main] Specify the branch to fetch the content (by default the main branch is
                               selected)
  --bulk-unpublish=<value>     [default: true] This flag is set to true by default. It indicates that contentstack's
                               bulkpublish API will be used to unpublish the entries
  --content-type=<value>       Content type filter
  --delivery-token=<value>     Delivery token for source environment
  --locale=<value>             Locale filter
  --retry-failed=<value>       Retry publishing failed entries from the logfile

DESCRIPTION
  Unpublish entries from the given environment
  The unpublish command is used to unpublish entries from the given environment

  Note: Environment (Source Environment) and Locale are required to execute the command successfully
  But, if retry-failed flag is set, then only a logfile is required

EXAMPLES
  General Usage

  $ csdx cm:stacks:unpublish --bulk-unpublish --content-type [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE] --alias [MANAGEMENT TOKEN ALIAS] --delivery-token [DELIVERY TOKEN]



  Using --config or -c flag

  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure --alias [ALIAS]`

  $ csdx cm:stacks:unpublish --config [PATH TO CONFIG FILE]

  $ csdx cm:stacks:unpublish -c [PATH TO CONFIG FILE]



  Using --retry-failed flag

  $ csdx cm:stacks:unpublish --retry-failed [LOG FILE NAME]



  Using --branch flag

  $ csdx cm:stacks:unpublish --bulk-unpublish --content-type [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE] --alias [MANAGEMENT TOKEN ALIAS] --delivery-token [DELIVERY TOKEN] --branch [BRANCH NAME]



  Using --stack-api-key flag

  $ csdx cm:stacks:unpublish --bulk-unpublish --content-type [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE] --stack-api-key [STACK API KEY] --delivery-token [DELIVERY TOKEN]
```

_See code: [src/commands/cm/entries/unpublish.js](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/entries/unpublish.js)_

## `csdx cm:entries:update-and-publish [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--content-types <value>] [-t <value>] [-e <value>] [-c <value>] [-y] [--locales <value>] [--branch <value>]`

Add fields from updated content types to their respective entries

```
USAGE
  $ csdx cm:entries:update-and-publish [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--content-types
    <value>] [-t <value>] [-e <value>] [-c <value>] [-y] [--locales <value>] [--branch <value>]

FLAGS
  -B, --branch=<value>           [default: main] Specify the branch to fetch the content (by default the main branch is
                                 selected)
  -a, --alias=<value>            Alias(name) for the management token
  -c, --config=<value>           Path to the config file
  -e, --environments=<value>...  Environments where entries will be published
  -k, --stack-api-key=<value>    Stack api key to be used
  -l, --locales=<value>...       Locales where entries will be published
  -t, --contentTypes=<value>...  The Contenttypes from which entries will be published
  -y, --yes                      Agree to process the command with the current configuration
  --api-version=<value>          API Version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].
  --bulk-publish=<value>         [default: true] This flag is set to true by default. It indicates that contentstack's
                                 bulkpublish API will be used to publish the entries
  --content-types=<value>...     The Contenttypes from which entries will be published
  --force                        Update and publish all entries even if no fields have been added
  --retry-failed=<value>         Retry publishing failed entries from the logfile (optional, overrides all other flags)

DESCRIPTION
  Add fields from updated content types to their respective entries
  The update-and-publish command is used to update existing entries with the updated schema of the respective content
  type

  Note: Content types, Environments and Locales are required to execute the command successfully
  But, if retry-failed flag is set, then only a logfile is required


ALIASES
  $ csdx cm:bulk-publish:add-fields

EXAMPLES
  General Usage

  $ csdx cm:entries:update-and-publish --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]



  Using --config or -c flag

  Generate a config file at the current working directory using `csdx cm:stacks:publish-configure -a [ALIAS]`

  $ csdx cm:entries:update-and-publish --config [PATH TO CONFIG FILE]

  $ csdx cm:entries:update-and-publish -c [PATH TO CONFIG FILE]



  Using --retry-failed

  $ csdx cm:entries:update-and-publish --retry-failed [LOG FILE NAME]



  Using --branch

  $ csdx cm:entries:update-and-publish --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS] --branch [BRANCH NAME]



  Using --stack-api-key

  $ csdx cm:entries:update-and-publish --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE 1] [LOCALE 2] --stack-api-key [STACK API KEY]
```

_See code: [src/commands/cm/entries/update-and-publish.js](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/entries/update-and-publish.js)_

## `csdx cm:stacks:publish`

Publish entries and assets to multiple environments and locales

```
USAGE
  $ csdx cm:stacks:publish

DESCRIPTION
  Publish entries and assets to multiple environments and locales
  The publish command is used to publish entries and assets, to the specified environments and locales.

  Note: Content types, Environments and Locales are required to execute the publish entries command successfully.
  Note: Environments and Locales are required to execute the publish assets command successfully.
  But, if retry-failed flag is set, then only a logfile is required

EXAMPLES
  General Usage

  $ csdx cm:stacks:publish --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE] --alias [MANAGEMENT TOKEN ALIAS]



  Using --config or -c flag

  Generate a config file in the current working directory using `csdx cm:stacks:publish-configure -a [ALIAS]`

  $ csdx cm:stacks:publish --config [PATH TO CONFIG FILE]

  $ csdx cm:stacks:publish -c [PATH TO CONFIG FILE]



  Using --retry-failed flag

  $ csdx cm:stacks:publish --retry-failed [LOG FILE NAME]



  Using --branch flag

  $ csdx cm:stacks:publish --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE] --alias [MANAGEMENT TOKEN ALIAS] --branch [BRANCH NAME]



  Using --api-version flag

  $ csdx cm:stacks:publish --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE] --alias [MANAGEMENT TOKEN ALIAS] --api-version [API VERSION]
```

_See code: [src/commands/cm/stacks/publish.js](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/stacks/publish.js)_

## `csdx cm:stacks:publish-clear-logs`

Clear the log folder

```
USAGE
  $ csdx cm:stacks:publish-clear-logs [--log-files-count] [-y]

FLAGS
  -y, --yes          Delete all files without asking for confirmation
  --log-files-count  List number of log files

DESCRIPTION
  Clear the log folder

ALIASES
  $ csdx cm:bulk-publish:clear

EXAMPLES
  $ csdx cm:stacks:publish-clear-logs

  $ csdx cm:stacks:publish-clear-logs --log-files-count

  $ csdx cm:stacks:publish-clear-logs --yes

  $ csdx cm:stacks:publish-clear-logs -y
```

_See code: [src/commands/cm/stacks/publish-clear-logs.js](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/stacks/publish-clear-logs.js)_

## `csdx cm:stacks:publish-configure`

The configure command is used to generate a configuration file for publish scripts.

```
USAGE
  $ csdx cm:stacks:publish-configure [-a <value>] [-k <value>]

FLAGS
  -a, --alias=<value>          Alias(name) for the management token
  -k, --stack-api-key=<value>  Stack api key to be used

DESCRIPTION
  The configure command is used to generate a configuration file for publish scripts.

ALIASES
  $ csdx cm:bulk-publish:configure

EXAMPLES
  $ csdx cm:stacks:publish-configure

  $ csdx cm:stacks:publish-configure -a <management_token_alias>

  $ csdx cm:stacks:publish-configure --alias <management_token_alias>

  $ csdx cm:stacks:publish-configure --stack-api-key <stack_api_key>
```

_See code: [src/commands/cm/stacks/publish-configure.js](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/stacks/publish-configure.js)_

## `csdx cm:stacks:publish-revert`

Revert publish operations by using a log file

```
USAGE
  $ csdx cm:stacks:publish-revert [--retry-failed <value>] [--log-file <value>]

FLAGS
  --log-file=<value>      logfile to be used to revert
  --retry-failed=<value>  retry publishing failed entries from the logfile

DESCRIPTION
  Revert publish operations by using a log file
  The revert command is used to revert all publish operations performed using bulk-publish script.
  A log file name is required to execute revert command


ALIASES
  $ csdx cm:bulk-publish:revert

EXAMPLES
  Using --log-file

  cm:bulk-publish:revert --log-file [LOG FILE NAME]



  Using --retry-failed

  cm:bulk-publish:revert --retry-failed [LOG FILE NAME]
```

_See code: [src/commands/cm/stacks/publish-revert.js](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/stacks/publish-revert.js)_

## `csdx csdx cm:stacks:unpublish [-a <value>] [-e <value>] [-c <value>] [-y] [--locale <value>] [--branch <value>] [--retry-failed <value>] [--bulk-unpublish <value>] [--content-type <value>] [--delivery-token <value>] [--only-assets] [--only-entries]`

Unpublish entries or assets of given content types from the specified environment

```
USAGE
  $ csdx csdx cm:stacks:unpublish [-a <value>] [-e <value>] [-c <value>] [-y] [--locale <value>] [--branch <value>]
    [--retry-failed <value>] [--bulk-unpublish <value>] [--content-type <value>] [--delivery-token <value>]
    [--only-assets] [--only-entries]

FLAGS
  -B, --branch=<value>         [default: main] Specify the branch to fetch the content from (default is main branch)
  -a, --alias=<value>          Alias(name) for the management token
  -c, --config=<value>         Path to the config file
  -e, --environment=<value>    Source Environment
  -k, --stack-api-key=<value>  Stack api key to be used
  -l, --locale=<value>         Locale filter
  -y, --yes                    Agree to process the command with the current configuration
  --api-version=<value>        API Version to be used. Values [Default: 3, Nested Reference Publishing: 3.2].
  --bulk-unpublish=<value>     [default: true] This flag is set to true by default. It indicates that contentstack's
                               bulkpublish API will be used to unpublish the entries and assets
  --content-type=<value>       Content type filter
  --delivery-token=<value>     Delivery token for source environment
  --retry-failed=<value>       Retry publishing failed entries from the logfile (optional, overrides all other flags)

DESCRIPTION
  Unpublish entries or assets of given content types from the specified environment
  The unpublish command is used to unpublish entries or assets from given environment

  Environment (Source Environment) and Locale are required to execute the command successfully
  But, if retry-failed flag is set, then only a logfile is required

  A content type can be specified for unpublishing entries, but if no content-type(s) is/are specified and --only-assets
  is not used,
  then all entries from all content types will be unpublished from the source environment

  Note: --only-assets can be used to unpublish only assets and --only-entries can be used to unpublish only entries.
  (--only-assets and --only-entries cannot be used together at the same time)


ALIASES
  $ csdx cm:bulk-publish:unpublish

EXAMPLES
  General Usage

  $ csdx cm:stacks:unpublish --bulk-unpublish --content-type [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE] --alias [MANAGEMENT TOKEN ALIAS] ----delivery-token [DELIVERY TOKEN]



  Using --config or -c flag

  Generate a config file at the current working directory using `csdx cm:bulk-publish:configure --alias [ALIAS]`

  $ csdx cm:stacks:unpublish --config [PATH TO CONFIG FILE]

  $ csdx cm:stacks:unpublish -c [PATH TO CONFIG FILE]



  Using --retry-failed flag

  $ csdx cm:stacks:unpublish --retry-failed [LOG FILE NAME]



  No content type

  $ csdx cm:stacks:unpublish --environment [SOURCE ENV] --locale [LOCALE] (Will unpublish all entries from all content types and assets from the source environment)



  Using --only-assets

  $ csdx cm:stacks:unpublish --environment [SOURCE ENV] --locale [LOCALE] --only-assets (Will unpublish only assets from the source environment)



  Using --only-entries

  $ csdx cm:stacks:unpublish --environment [SOURCE ENV] --locale [LOCALE] --only-entries (Will unpublish only entries, all entries, from the source environment)

  $ csdx cm:stacks:unpublish --contentType [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE] --only-entries (Will unpublish only entries, (from CONTENT TYPE) from the source environment)



  Using --branch flag

  $ csdx cm:stacks:unpublish --bulk-unpublish --content-type [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE] --alias [MANAGEMENT TOKEN ALIAS] --delivery-token [DELIVERY TOKEN] --branch [BRANCH NAME]



  Using --stack-api-key flag

  $ csdx cm:stacks:unpublish --bulk-unpublish --content-type [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE] --stack-api-key [STACK API KEY] --delivery-token [DELIVERY TOKEN]
```

_See code: [src/commands/cm/stacks/unpublish.js](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/stacks/unpublish.js)_
<!-- commandsstop -->
