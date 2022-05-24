# @contentstack/cli-auth

It is Contentstack’s CLI plugin to perform authentication-related activities. To get started with authenticating yourself with the CLI, refer to the [CLI’s Authentication documentation](https://www.contentstack.com/docs/developers/cli/authentication)

[![License](https://img.shields.io/npm/l/@contentstack/cli)](https://github.com/contentstack/cli/blob/main/LICENSE)

<!-- toc -->
* [@contentstack/cli-auth](#contentstackcli-auth)
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
@contentstack/cli/1.0.0 linux-x64 node-v16.14.2
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
- [@contentstack/cli-auth](#contentstackcli-auth)
- [Usage](#usage)
- [Commands](#commands)
  - [`csdx auth:login`](#csdx-authlogin)
  - [`csdx auth:logout`](#csdx-authlogout)
  - [`csdx auth:tokens`](#csdx-authtokens)
  - [`csdx auth:tokens:add`](#csdx-authtokensadd)
  - [`csdx auth:tokens:remove`](#csdx-authtokensremove)
  - [`csdx auth:whoami`](#csdx-authwhoami)
  - [`csdx cm:assets:publish`](#csdx-cmassetspublish)
  - [`csdx cm:bootstrap`](#csdx-cmbootstrap)
  - [`csdx cm:bulk-publish`](#csdx-cmbulk-publish)
  - [`csdx cm:bulk-publish:cross-publish`](#csdx-cmbulk-publishcross-publish)
  - [`csdx cm:bulk-publish:entries`](#csdx-cmbulk-publishentries)
  - [`csdx cm:bulk-publish:entry-edits`](#csdx-cmbulk-publishentry-edits)
  - [`csdx cm:bulk-publish:nonlocalized-field-changes`](#csdx-cmbulk-publishnonlocalized-field-changes)
  - [`csdx cm:bulk-publish:unpublish`](#csdx-cmbulk-publishunpublish)
  - [`csdx cm:bulk-publish:unpublished-entries`](#csdx-cmbulk-publishunpublished-entries)
  - [`csdx cm:entries:export-to-csv`](#csdx-cmentriesexport-to-csv)
  - [`csdx cm:entries:migrate-html-rte`](#csdx-cmentriesmigrate-html-rte)
  - [`csdx cm:entries:update-and-publish`](#csdx-cmentriesupdate-and-publish)
  - [`csdx cm:migration`](#csdx-cmmigration)
  - [`csdx cm:stacks:clone`](#csdx-cmstacksclone)
  - [`csdx cm:stacks:export`](#csdx-cmstacksexport)
  - [`csdx cm:stacks:import`](#csdx-cmstacksimport)
  - [`csdx cm:stacks:publish-clear-logs`](#csdx-cmstackspublish-clear-logs)
  - [`csdx cm:stacks:publish-configure`](#csdx-cmstackspublish-configure)
  - [`csdx cm:stacks:publish-revert`](#csdx-cmstackspublish-revert)
  - [`csdx cm:stacks:seed`](#csdx-cmstacksseed)
  - [`csdx config:get:region`](#csdx-configgetregion)
  - [`csdx config:set:region [REGION]`](#csdx-configsetregion-region)
  - [`csdx help [COMMAND]`](#csdx-help-command)
  - [`csdx plugins`](#csdx-plugins)
  - [`csdx plugins:inspect PLUGIN...`](#csdx-pluginsinspect-plugin)
  - [`csdx plugins:install PLUGIN...`](#csdx-pluginsinstall-plugin)
  - [`csdx plugins:link PLUGIN`](#csdx-pluginslink-plugin)
  - [`csdx plugins:uninstall PLUGIN...`](#csdx-pluginsuninstall-plugin)
  - [`csdx plugins:update`](#csdx-pluginsupdate)

## `csdx auth:login`

User sessions login

```
User sessions login

USAGE
  $ csdx auth:login

OPTIONS
  -p, --password=password  Password
  -u, --username=username  User name

ALIASES
  $ csdx login

EXAMPLES
  $ csdx auth:login
  $ csdx auth:login -u <username>
  $ csdx auth:login -u <username> -p <password>
  $ csdx auth:login --username <username>
  $ csdx auth:login --username <username> --password <password>
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/v1.0.0/src/commands/auth/login.ts)_

## `csdx auth:logout`

User session logout

```
User session logout

USAGE
  $ csdx auth:logout

OPTIONS
  -y, --yes  Force logging out for skipping the confirmation

ALIASES
  $ csdx logout

EXAMPLES
  $ csdx auth:logout
  $ csdx auth:logout -y
  $ csdx auth:logout --yes
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/v1.0.0/src/commands/auth/logout.ts)_

## `csdx auth:tokens`

Lists all existing tokens added to the session

```
Lists all existing tokens added to the session

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

EXAMPLE
  $ csdx auth:tokens
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/v1.0.0/src/commands/auth/tokens/index.ts)_

## `csdx auth:tokens:add`

Adds management/delivery tokens to your session to use it with further CLI commands

```
Adds management/delivery tokens to your session to use it with further CLI commands

USAGE
  $ csdx auth:tokens:add

OPTIONS
  -a, --alias=alias                  Name of the token alias
  -d, --delivery                     Set this while saving delivery token
  -e, --environment=environment      Environment name for delivery token
  -k, --stack-api-key=stack-api-key  Stack API Key
  -m, --management                   Set this while saving management token
  -t, --token=token                  Token
  -y, --yes                          Skipping confirmation

EXAMPLES
  $ csdx auth:tokens:add
  $ csdx auth:tokens:add -a <alias>
  $ csdx auth:tokens:add -k <stack api key>
  $ csdx auth:tokens:add --delivery
  $ csdx auth:tokens:add --management
  $ csdx auth:tokens:add -e <environment>
  $ csdx auth:tokens:add --token <token>
  $ csdx auth:tokens:add -a <alias> -k <stack api key> --management --token <management token>
  $ csdx auth:tokens:add -a <alias> -k <stack api key> --delivery -e <environment> --token <delivery token>
  $ csdx auth:tokens:add --alias <alias> --stack-api-key <stack api key> --management --token <management token>
  $ csdx auth:tokens:add --alias <alias> --stack-api-key <stack api key> --delivery -e <environment> --token <delivery 
  token>
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/v1.0.0/src/commands/auth/tokens/add.ts)_

## `csdx auth:tokens:remove`

Removes selected tokens

```
Removes selected tokens

USAGE
  $ csdx auth:tokens:remove

OPTIONS
  -a, --alias=alias  Token alias
  -i, --ignore       Ignore

EXAMPLES
  $ csdx auth:tokens:remove
  $ csdx auth:tokens:remove -a <aliase>
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/v1.0.0/src/commands/auth/tokens/remove.ts)_

## `csdx auth:whoami`

Display current users email address

```
Display current users email address

USAGE
  $ csdx auth:whoami

ALIASES
  $ csdx whoami

EXAMPLE
  $ csdx auth:whoami
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/v1.0.0/src/commands/auth/whoami.ts)_

## `csdx cm:assets:publish`

Publish assets to specified environments

```
Publish assets to specified environments
The assets command is used for publishing assets from the specified stack, to the specified environments

Environment(s) and Locale(s) are required for executing the command successfully
But, if retryFailed flag is set, then only a logfile is required


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

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/assets/publish.js)_

## `csdx cm:bootstrap`

Bootstrap contentstack apps

```
Bootstrap contentstack apps

USAGE
  $ csdx cm:bootstrap

OPTIONS
  --access-token=access-token  Access token for private github repo
  --app-name=app-name          App name, reactjs-starter, nextjs-starter, gatsby-starter, angular-starter, nuxt-starter

  --project-dir=project-dir    Directory to setup the project. If directory name has a space then provide the path as a
                               string or escap the space using back slash eg: "../../test space" or ../../test\ space

EXAMPLES
  $ csdx cm:bootstrap
  $ csdx cm:bootstrap --project-dir <path/to/setup/the/app>
  $ csdx cm:bootstrap --access-token <github access token>
  $ csdx cm:bootstrap --app-name "reactjs-starter" --project-dir <path/to/setup/the/app>
```

_See code: [@contentstack/cli-cm-bootstrap](https://github.com/contentstack/cli/blob/v1.0.7/src/commands/cm/bootstrap.ts)_

## `csdx cm:bulk-publish`

Bulk Publish script for managing entries and assets

```
Bulk Publish script for managing entries and assets


USAGE
  $ csdx cm:bulk-publish
```

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/index.js)_

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

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/cross-publish.js)_

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

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/entries.js)_

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

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/entry-edits.js)_

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

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/nonlocalized-field-changes.js)_

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

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/unpublish.js)_

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

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/unpublished-entries.js)_

## `csdx cm:entries:export-to-csv`

Export entries or organization users to csv using this command

```
Export entries or organization users to csv using this command

USAGE
  $ csdx cm:entries:export-to-csv

ALIASES
  $ csdx cm:export-to-csv

EXAMPLE
  csdx cm:entries:export-to-csv
```

_See code: [@contentstack/cli-cm-export-to-csv](https://github.com/contentstack/cli/blob/v1.0.0/src/commands/cm/entries/export-to-csv.js)_

## `csdx cm:entries:migrate-html-rte`

Migration script for migrating HTML RTE to JSON RTE

```
Migration script for migrating HTML RTE to JSON RTE

USAGE
  $ csdx cm:entries:migrate-html-rte

OPTIONS
  -a, --alias=alias              Alias for the management token to be used
  -c, --config-path=config-path  Path to config file to be used
  -y, --yes                      Agree to process the command with the current configuration
  --content-type=content-type    The content-type from which entries need to be migrated
  --delay=delay                  [default: 1000] Provide delay in ms between two entry update

  --global-field                 This flag is set to false by default. It indicates that current content-type is
                                 global-field

  --html-path=html-path          Provide path of HTML RTE to migrate

  --json-path=json-path          Provide path of JSON RTE to migrate

  --locale=locale                The locale from which entries need to be migrated

ALIASES
  $ csdx cm:migrate-rte

EXAMPLES
  General Usage
  csdx cm:entries:migrate-html-rte --config-path path/to/config.json

  Using Flags
  csdx cm:entries:migrate-html-rte --alias alias --content-type content_type_uid --html-path html-path --json-path 
  json-path

  Nested RTE
  csdx cm:entries:migrate-html-rte --alias alias --content-type content_type_uid --html-path 
  modular_block_uid.block_uid.html_rte_uid --json-path modular_block_uid.block_uid.json_rte_uid

  csdx cm:entries:migrate-html-rte --alias alias --content-type content_type_uid --html-path group_uid.html_rte_uid 
  --json-path group_uid.json_rte_uid

  Global Field
  csdx cm:entries:migrate-html-rte --alias alias --content-type global_field_uid --global-field --html-path html-path 
  --json-path json-path
```

_See code: [@contentstack/cli-cm-migrate-rte](https://github.com/contentstack/cli/blob/v1.0.5/src/commands/cm/entries/migrate-html-rte.js)_

## `csdx cm:entries:update-and-publish`

Add fields from updated content types to their respective entries

```
Add fields from updated content types to their respective entries
The add-fields command is used for updating already existing entries with the updated schema of their respective Content Type

Content Types, Environments and Locales are required for executing the command successfully
But, if retry-failed flag is set, then only a logfile is required


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

  --content-types=content-types    The Content-Types from which entries need to be published

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
  csdx cm:entries:update-and-publish --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 
  2] --locale [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]

  Using --config or -c flag
  Generate a config file at the current working directory using `csdx cm:stacks:publish-configure -a [ALIAS]`
  csdx cm:entries:update-and-publish --config [PATH TO CONFIG FILE]
  csdx cm:entries:update-and-publish -c [PATH TO CONFIG FILE]

  Using --retry-failed
  csdx cm:entries:update-and-publish --retry-failed [LOG FILE NAME]

  csdx cm:entries:update-and-publish --content-types [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 
  2] --locale [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]
```

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/entries/update-and-publish.js)_

## `csdx cm:migration`

Contentstack migration script.

```
Contentstack migration script.

USAGE
  $ csdx cm:migration

OPTIONS
  -A, --authtoken                                      Use this flag to use the auth token of the current session. After
                                                       logging in CLI, an auth token is generated for each new session.

  -B, --branch=branch                                  Use this flag to add the branch name where you want to perform
                                                       the migration.

  -a, --management-token-alias=management-token-alias  Use this flag to add the management token alias.

  -k, --api-key=api-key                                With this flag add the API key of your stack.

  -n, --filePath=filePath                              Use this flag to provide the path of the file of the migration
                                                       script provided by the user.

  --multi                                              This flag helps you to migrate multiple content files in a single
                                                       instance.
```

_See code: [@contentstack/cli-migration](https://github.com/contentstack/cli-migration/blob/v1.0.0/src/commands/cm/migration.js)_

## `csdx cm:stacks:clone`

Clone data (structure or content or both) of a stack into another stack

```
Clone data (structure or content or both) of a stack into another stack
Use this plugin to automate the process of cloning a stack in a few steps.


USAGE
  $ csdx cm:stacks:clone

OPTIONS
  --source-branch=source-branch  Branch of the source stack
  --target-branch=target-branch  Branch of the target stack

DESCRIPTION
  Use this plugin to automate the process of cloning a stack in a few steps.

ALIASES
  $ csdx cm:stack-clone

EXAMPLES
  csdx cm:stacks:clone
  csdx cm:stacks:clone --source-branch --target-branch
  csdx cm:stacks:clone -a <management token alias>
```

_See code: [@contentstack/cli-cm-clone](https://github.com/contentstack/cli/blob/v1.0.0/src/commands/cm/stacks/clone.js)_

## `csdx cm:stacks:export`

Export content from a stack

```
Export content from a stack
...
Export content from one stack to another


USAGE
  $ csdx cm:stacks:export

OPTIONS
  -A, --auth-token                                     to use auth token
  -B, --branch=branch                                  [optional] branch name
  -a, --management-token-alias=management-token-alias  alias of the management token
  -c, --config=config                                  [optional] path of the config
  -d, --data=data                                      path or location to store the data
  -k, --stack-api-key=stack-api-key                    API key of the source stack
  -m, --module=module                                  [optional] specific module name
  -s, --stack-uid=stack-uid                            API key of the source stack
  -t, --content-type=content-type                      [optional] content type
  --data-dir=data-dir                                  path or location to store the data
  --secured-assets                                     [optional] use when assets are secured

DESCRIPTION
  ...
  Export content from one stack to another

ALIASES
  $ csdx cm:export

EXAMPLES
  csdx cm:export -k <stack_ApiKey> -d <path/of/export/destination/dir>
  csdx cm:export -c <path/to/config/dir>
  csdx cm:export -a <management_token_alias>
  csdx cm:export -a <management_token_alias> --data-dir <path/to/export/destination/dir>
  csdx cm:export -a <management_token_alias> -c <path/to/config/file>
  csdx cm:export --module <single module name>
  csdx cm:export --branch [optional] branch name
```

_See code: [@contentstack/cli-cm-export](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-export/src/commands/cm/stacks/export.js)_

## `csdx cm:stacks:import`

Import script for importing the content into new stack

```
Import script for importing the content into new stack
...
Once you export content from the source stack, import it to your destination stack by using the cm:stacks:import command.


USAGE
  $ csdx cm:stacks:import

OPTIONS
  -A, --auth-token                                     to use auth token
  -B, --branch=branch                                  [optional] branch name
  -a, --management-token-alias=management-token-alias  alias of the management token
  -b, --backup-dir=backup-dir                          [optional] backup directory name when using specific module
  -c, --config=config                                  [optional] path of config file
  -d, --data=data                                      path and location where data is stored
  -k, --stack-api-key=stack-api-key                    API key of the target stack
  -m, --module=module                                  [optional] specific module name
  -s, --stack-uid=stack-uid                            API key of the target stack
  --data-dir=data-dir                                  path and location where data is stored

DESCRIPTION
  ...
  Once you export content from the source stack, import it to your destination stack by using the cm:stacks:import 
  command.

ALIASES
  $ csdx cm:import

EXAMPLES
  csdx cm:stacks:import -s <stack_ApiKey> -d <path/of/export/destination/dir>
  csdx cm:stacks:import -c <path/of/config/dir>
  csdx cm:stacks:import -m <single module name>
  csdx cm:stacks:import -m <single module name> -b <backup dir>
  csdx cm:stacks:import -a <management_token_alias>
  csdx cm:stacks:import -a <management_token_alias> -d <path/of/export/destination/dir>
  csdx cm:stacks:import -a <management_token_alias> -c <path/of/config/file>
  csdx cm:stacks:import -m <single module name>
  csdx cm:stacks:import -B <branch name>
```

_See code: [@contentstack/cli-cm-import](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-import/src/commands/cm/stacks/import.js)_

## `csdx cm:stacks:publish-clear-logs`

Clear the log folder

```
Clear the log folder

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

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/stacks/publish-clear-logs.js)_

## `csdx cm:stacks:publish-configure`

The configure command is used for generating a configuration file for publish script.

```
The configure command is used for generating a configuration file for publish script.

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

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/stacks/publish-configure.js)_

## `csdx cm:stacks:publish-revert`

Revert publish operations by using a log file

```
Revert publish operations by using a log file
The revert command is used for reverting all publish operations performed using bulk-publish script.
A log file name is required to execute revert command


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

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-bulk-publish/src/commands/cm/stacks/publish-revert.js)_

## `csdx cm:stacks:seed`

Create a Stack from existing content types, entries, assets, etc

```
Create a Stack from existing content types, entries, assets, etc

USAGE
  $ csdx cm:stacks:seed

OPTIONS
  -k, --stack-api-key=stack-api-key  Provide stack api key to seed content to
  -n, --stack-name=stack-name        Name of a new stack that needs to be created.
  -o, --org=org                      Provide Organization UID to create a new stack
  -r, --repo=repo                    GitHub account or GitHub account/repository
  -s, --stack=stack                  Provide stack UID to seed content to

ALIASES
  $ csdx cm:seed

EXAMPLES
  $ csdx cm:stacks:seed
  $ csdx cm:stacks:seed --repo "account"
  $ csdx cm:stacks:seed --repo "account/repository"
  $ csdx cm:stacks:seed --repo "account/repository" --stack-api-key "stack-api-key" //seed content into specific stack
  $ csdx cm:stacks:seed --repo "account/repository" --org "your-org-uid" --stack-name "stack-name" //create a new stack 
  in given org uid
```

_See code: [@contentstack/cli-cm-seed](https://github.com/contentstack/cli/blob/v1.0.11/src/commands/cm/stacks/seed.ts)_

## `csdx config:get:region`

Get current region set for CLI

```
Get current region set for CLI

USAGE
  $ csdx config:get:region

EXAMPLE
  $ csdx config:get:region
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/v1.0.1/src/commands/config/get/region.ts)_

## `csdx config:set:region [REGION]`

Set region for CLI

```
Set region for CLI

USAGE
  $ csdx config:set:region [REGION]

OPTIONS
  -d, --cda=cda    Custom host to set for content delivery API, if this flag is added then cma and name flags are
                   required

  -m, --cma=cma    Custom host to set for content management API, , if this flag is added then cda and name flags are
                   required

  -n, --name=name  Name for the region, if this flag is added then cda and cma flags are required

EXAMPLES
  $ csdx config:set:region
  $ csdx config:set:region NA
  $ csdx config:set:region NA
  $ csdx config:set:region --cma <contentstack_cma_endpoint> --cda <contentstack_cda_endpoint> --name "India"
  $ csdx config:set:region --cma="https://in-api.contentstack.com" --cda="https://in-cda.contentstack.com" 
  --name="India"
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/v1.0.1/src/commands/config/set/region.ts)_

## `csdx help [COMMAND]`

display help for csdx

```
display help for <%= config.bin %>

USAGE
  $ csdx help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.18/src/commands/help.ts)_

## `csdx plugins`

list installed plugins

```
list installed plugins

USAGE
  $ csdx plugins

OPTIONS
  --core  show core plugins

EXAMPLE
  $ csdx plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.10.11/src/commands/plugins/index.ts)_

## `csdx plugins:inspect PLUGIN...`

displays installation properties of a plugin

```
displays installation properties of a plugin

USAGE
  $ csdx plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] plugin to inspect

OPTIONS
  -h, --help     show CLI help
  -v, --verbose

EXAMPLE
  $ csdx plugins:inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.10.11/src/commands/plugins/inspect.ts)_

## `csdx plugins:install PLUGIN...`

installs a plugin into the CLI

```
installs a plugin into the CLI
Can be installed from npm or a git url.

Installation of a user-installed plugin will override a core plugin.

e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in the CLI without the need to patch and update the whole CLI.


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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.10.11/src/commands/plugins/install.ts)_

## `csdx plugins:link PLUGIN`

links a plugin into the CLI for development

```
links a plugin into the CLI for development
Installation of a linked plugin will override a user-installed or core plugin.

e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello' command will override the user-installed or core plugin implementation. This is useful for development work.


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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.10.11/src/commands/plugins/link.ts)_

## `csdx plugins:uninstall PLUGIN...`

removes a plugin from the CLI

```
removes a plugin from the CLI

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.10.11/src/commands/plugins/uninstall.ts)_

## `csdx plugins:update`

update installed plugins

```
update installed plugins

USAGE
  $ csdx plugins:update

OPTIONS
  -h, --help     show CLI help
  -v, --verbose
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.10.11/src/commands/plugins/update.ts)_
<!-- commandsstop -->

```

```
