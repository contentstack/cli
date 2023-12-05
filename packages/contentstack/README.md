# @contentstack/cli

Use Contentstack Command-line Interface to command Contentstack for executing a set of operations from the terminal. To get started with CLI, refer to the [CLI’s documentation](https://www.contentstack.com/docs/developers/cli)

[![License](https://img.shields.io/npm/l/@contentstack/cli)](https://github.com/contentstack/cli/blob/main/LICENSE)

<!-- toc -->
* [@contentstack/cli](#contentstackcli)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli
$ csdx COMMAND
running command...
$ csdx (--version|-v)
@contentstack/cli/1.11.2 darwin-arm64 node-v20.8.0
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
* [`csdx auth:login`](#csdx-authlogin)
* [`csdx auth:logout`](#csdx-authlogout)
* [`csdx auth:tokens`](#csdx-authtokens)
* [`csdx auth:tokens:add [-a <value>] [--delivery] [--management] [-e <value>] [-k <value>] [-y] [--token <value>]`](#csdx-authtokensadd--a-value---delivery---management--e-value--k-value--y---token-value)
* [`csdx auth:tokens:remove`](#csdx-authtokensremove)
* [`csdx auth:whoami`](#csdx-authwhoami)
* [`csdx cm:assets:publish [-a <value>] [--retry-failed <value>] [-e <value>] [--folder-uid <value>] [--bulk-publish <value>] [-c <value>] [-y] [--locales <value>] [--branch <value>] [--delivery-token <value>] [--source-env <value>]`](#csdx-cmassetspublish--a-value---retry-failed-value--e-value---folder-uid-value---bulk-publish-value--c-value--y---locales-value---branch-value---delivery-token-value---source-env-value)
* [`csdx cm:assets:unpublish`](#csdx-cmassetsunpublish)
* [`csdx cm:bootstrap`](#csdx-cmbootstrap)
* [`csdx cm:branches`](#csdx-cmbranches)
* [`csdx cm:branches:create`](#csdx-cmbranchescreate)
* [`csdx cm:branches:delete [-uid <value>] [-k <value>]`](#csdx-cmbranchesdelete--uid-value--k-value)
* [`csdx cm:branches:diff [--base-branch <value>] [--compare-branch <value>] [-k <value>][--module <value>]`](#csdx-cmbranchesdiff---base-branch-value---compare-branch-value--k-value--module-value)
* [`csdx cm:branches:merge [-k <value>][--compare-branch <value>] [--no-revert] [--export-summary-path <value>] [--use-merge-summary <value>] [--comment <value>] [--base-branch <value>]`](#csdx-cmbranchesmerge--k-value--compare-branch-value---no-revert---export-summary-path-value---use-merge-summary-value---comment-value---base-branch-value)
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
* [`csdx cm:entries:migrate-html-rte`](#csdx-cmentriesmigrate-html-rte)
* [`csdx cm:entries:publish [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--publish-all-content-types] [--content-types <value>] [--locales <value>] [-e <value>] [-c <value>] [-y] [--branch <value>] [--delivery-token <value>] [--source-env <value>]`](#csdx-cmentriespublish--a-value---retry-failed-value---bulk-publish-value---publish-all-content-types---content-types-value---locales-value--e-value--c-value--y---branch-value---delivery-token-value---source-env-value-1)
* [`csdx cm:entries:publish-modified [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--source-env <value>] [--content-types <value>] [--locales <value>] [-e <value>] [-c <value>] [-y] [--branch <value>]`](#csdx-cmentriespublish-modified--a-value---retry-failed-value---bulk-publish-value---source-env-value---content-types-value---locales-value--e-value--c-value--y---branch-value-1)
* [`csdx cm:entries:publish-non-localized-fields [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--source-env <value>] [--content-types <value>] [-e <value>] [-c <value>] [-y] [--branch <value>]`](#csdx-cmentriespublish-non-localized-fields--a-value---retry-failed-value---bulk-publish-value---source-env-value---content-types-value--e-value--c-value--y---branch-value-1)
* [`csdx cm:entries:publish-only-unpublished [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--source-env <value>] [--content-types <value>] [--locales <value>] [-e <value>] [-c <value>] [-y] [--branch <value>]`](#csdx-cmentriespublish-only-unpublished--a-value---retry-failed-value---bulk-publish-value---source-env-value---content-types-value---locales-value--e-value--c-value--y---branch-value-1)
* [`csdx cm:entries:unpublish`](#csdx-cmentriesunpublish)
* [`csdx cm:entries:update-and-publish [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--content-types <value>] [-t <value>] [-e <value>] [-c <value>] [-y] [--locales <value>] [--branch <value>]`](#csdx-cmentriesupdate-and-publish--a-value---retry-failed-value---bulk-publish-value---content-types-value--t-value--e-value--c-value--y---locales-value---branch-value-1)
* [`csdx cm:stacks:export [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--content-types <value>] [--branch <value>] [--secured-assets]`](#csdx-cmstacksexport--c-value--k-value--d-value--a-value---module-value---content-types-value---branch-value---secured-assets)
* [`csdx cm:export-to-csv`](#csdx-cmexport-to-csv)
* [`csdx cm:stacks:import [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--backup-dir <value>] [--branch <value>] [--import-webhook-status disable|current]`](#csdx-cmstacksimport--c-value--k-value--d-value--a-value---module-value---backup-dir-value---branch-value---import-webhook-status-disablecurrent)
* [`csdx cm:migrate-rte`](#csdx-cmmigrate-rte)
* [`csdx cm:stacks:migration [-k <value>] [-a <value>] [--file-path <value>] [--branch <value>] [--config-file <value>] [--config <value>] [--multiple]`](#csdx-cmstacksmigration--k-value--a-value---file-path-value---branch-value---config-file-value---config-value---multiple)
* [`csdx cm:stacks:seed [--repo <value>] [--org <value>] [-k <value>] [-n <value>] [-y <value>] [-s <value>]`](#csdx-cmstacksseed---repo-value---org-value--k-value--n-value--y-value--s-value)
* [`csdx cm:stacks:clone [--source-branch <value>] [--target-branch <value>] [--source-management-token-alias <value>] [--destination-management-token-alias <value>] [-n <value>] [--type a|b] [--source-stack-api-key <value>] [--destination-stack-api-key <value>] [--import-webhook-status disable|current]`](#csdx-cmstacksclone---source-branch-value---target-branch-value---source-management-token-alias-value---destination-management-token-alias-value--n-value---type-ab---source-stack-api-key-value---destination-stack-api-key-value---import-webhook-status-disablecurrent)
* [`csdx cm:stacks:audit`](#csdx-cmstacksaudit)
* [`csdx cm:stacks:audit:fix`](#csdx-cmstacksauditfix)
* [`csdx cm:stacks:clone [--source-branch <value>] [--target-branch <value>] [--source-management-token-alias <value>] [--destination-management-token-alias <value>] [-n <value>] [--type a|b] [--source-stack-api-key <value>] [--destination-stack-api-key <value>] [--import-webhook-status disable|current]`](#csdx-cmstacksclone---source-branch-value---target-branch-value---source-management-token-alias-value---destination-management-token-alias-value--n-value---type-ab---source-stack-api-key-value---destination-stack-api-key-value---import-webhook-status-disablecurrent-1)
* [`csdx cm:stacks:export [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--content-types <value>] [--branch <value>] [--secured-assets]`](#csdx-cmstacksexport--c-value--k-value--d-value--a-value---module-value---content-types-value---branch-value---secured-assets-1)
* [`csdx cm:stacks:import [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--backup-dir <value>] [--branch <value>] [--import-webhook-status disable|current]`](#csdx-cmstacksimport--c-value--k-value--d-value--a-value---module-value---backup-dir-value---branch-value---import-webhook-status-disablecurrent-1)
* [`csdx cm:stacks:migration [-k <value>] [-a <value>] [--file-path <value>] [--branch <value>] [--config-file <value>] [--config <value>] [--multiple]`](#csdx-cmstacksmigration--k-value--a-value---file-path-value---branch-value---config-file-value---config-value---multiple-1)
* [`csdx cm:stacks:publish`](#csdx-cmstackspublish)
* [`csdx cm:stacks:publish-clear-logs`](#csdx-cmstackspublish-clear-logs)
* [`csdx cm:stacks:publish-configure`](#csdx-cmstackspublish-configure)
* [`csdx cm:stacks:publish-revert`](#csdx-cmstackspublish-revert)
* [`csdx cm:stacks:seed [--repo <value>] [--org <value>] [-k <value>] [-n <value>] [-y <value>] [-s <value>]`](#csdx-cmstacksseed---repo-value---org-value--k-value--n-value--y-value--s-value-1)
* [`csdx csdx cm:stacks:unpublish [-a <value>] [-e <value>] [-c <value>] [-y] [--locale <value>] [--branch <value>] [--retry-failed <value>] [--bulk-unpublish <value>] [--content-type <value>] [--delivery-token <value>] [--only-assets] [--only-entries]`](#csdx-csdx-cmstacksunpublish--a-value--e-value--c-value--y---locale-value---branch-value---retry-failed-value---bulk-unpublish-value---content-type-value---delivery-token-value---only-assets---only-entries-1)
* [`csdx config:get:base-branch`](#csdx-configgetbase-branch)
* [`csdx config:get:early-access-header`](#csdx-configgetearly-access-header)
* [`csdx config:get:region`](#csdx-configgetregion)
* [`csdx config:remove:base-branch`](#csdx-configremovebase-branch)
* [`csdx config:remove:early-access-header`](#csdx-configremoveearly-access-header)
* [`csdx config:set:base-branch`](#csdx-configsetbase-branch)
* [`csdx config:set:early-access-header`](#csdx-configsetearly-access-header)
* [`csdx config:set:region [REGION]`](#csdx-configsetregion-region)
* [`csdx help [COMMANDS]`](#csdx-help-commands)
* [`csdx launch`](#csdx-launch)
* [`csdx launch:deployments`](#csdx-launchdeployments)
* [`csdx launch:environments`](#csdx-launchenvironments)
* [`csdx launch:functions`](#csdx-launchfunctions)
* [`csdx launch:logs`](#csdx-launchlogs)
* [`csdx launch:open`](#csdx-launchopen)
* [`csdx login`](#csdx-login)
* [`csdx logout`](#csdx-logout)
* [`csdx plugins`](#csdx-plugins)
* [`csdx plugins:install PLUGIN...`](#csdx-pluginsinstall-plugin)
* [`csdx plugins:inspect PLUGIN...`](#csdx-pluginsinspect-plugin)
* [`csdx plugins:install PLUGIN...`](#csdx-pluginsinstall-plugin-1)
* [`csdx plugins:link PLUGIN`](#csdx-pluginslink-plugin)
* [`csdx plugins:uninstall PLUGIN...`](#csdx-pluginsuninstall-plugin)
* [`csdx plugins:uninstall PLUGIN...`](#csdx-pluginsuninstall-plugin-1)
* [`csdx plugins:uninstall PLUGIN...`](#csdx-pluginsuninstall-plugin-2)
* [`csdx plugins:update`](#csdx-pluginsupdate)
* [`csdx tokens`](#csdx-tokens)
* [`csdx whoami`](#csdx-whoami)

## `csdx audit`

Perform audits and find possible errors in the exported Contentstack data

```
USAGE
  $ csdx audit [-c <value>] [-d <value>] [--report-path <value>] [--modules
    content-types|global-fields|entries] [--columns <value> | ] [--sort <value>] [--filter <value>] [--csv |
    --no-truncate]

FLAGS
  --modules=<option>...  Provide the list of modules to be audited
                         <options: content-types|global-fields|entries>
  --report-path=<value>  Path to store the audit reports

COMMON FLAGS
  -c, --config=<value>    Path of the external config
  -d, --data-dir=<value>  Path where the data is stored

TABLE FLAGS
  --columns=<value>  Show only the specified columns (comma-separated)
  --csv              The output is in the CSV format [alias: --output=csv]
  --filter=<value>   Filter property by partial string matching. For example: name=foo
  --no-truncate      The output is not truncated to fit the screen
  --sort=<value>     Property to sort by (prepend '-' for descending)

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
  $ csdx audit:fix [-c <value>] [-d <value>] [--report-path <value>] [--modules
    content-types|global-fields|entries] [--copy-path <value> --copy-dir] [--fix-only
    reference|global_field|json:rte|json:custom-field|blocks|group] [--columns <value> | ] [--sort <value>] [--filter
    <value>] [--csv | --no-truncate]

FLAGS
  --copy-dir              Create backup from the original data.
  --copy-path=<value>     Provide the path to backup the copied data
  --fix-only=<option>...  Provide the list of fix options
                          <options: reference|global_field|json:rte|json:custom-field|blocks|group>
  --modules=<option>...   Provide the list of modules to be audited
                          <options: content-types|global-fields|entries>
  --report-path=<value>   Path to store the audit reports

COMMON FLAGS
  -c, --config=<value>    Path of the external config
  -d, --data-dir=<value>  Path where the data is stored

TABLE FLAGS
  --columns=<value>  Show only the specified columns (comma-separated)
  --csv              The output is in the CSV format [alias: --output=csv]
  --filter=<value>   Filter property by partial string matching. For example: name=foo
  --no-truncate      The output is not truncated to fit the screen
  --sort=<value>     Property to sort by (prepend '-' for descending)

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

## `csdx auth:login`

User sessions login

```
USAGE
  $ csdx auth:login [-u <value> | --oauth] [-p <value> | ]

FLAGS
  -p, --password=<value>  Password
  -u, --username=<value>  User name
  --oauth                 Enables single sign-on (SSO) in Contentstack CLI

DESCRIPTION
  User sessions login

ALIASES
  $ csdx login

EXAMPLES
  $ csdx auth:login

  $ csdx auth:login -u <username>

  $ csdx auth:login -u <username> -p <password>

  $ csdx auth:login --username <username>

  $ csdx auth:login --username <username> --password <password>
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/main/packages/contentstack-auth/src/commands/auth/login.ts)_

## `csdx auth:logout`

User session logout

```
USAGE
  $ csdx auth:logout [-y]

FLAGS
  -y, --yes  Force log out by skipping the confirmation

DESCRIPTION
  User session logout

ALIASES
  $ csdx logout

EXAMPLES
  $ csdx auth:logout

  $ csdx auth:logout -y

  $ csdx auth:logout --yes
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/main/packages/contentstack-auth/src/commands/auth/logout.ts)_

## `csdx auth:tokens`

Lists all existing tokens added to the session

```
USAGE
  $ csdx auth:tokens [--columns <value> | -x] [--sort <value>] [--filter <value>] [--output csv|json|yaml |  |
    [--csv | --no-truncate]] [--no-header | ]

FLAGS
  -x, --extended     show extra columns
  --columns=<value>  only show provided columns (comma-separated)
  --csv              output is csv format [alias: --output=csv]
  --filter=<value>   filter property by partial string matching, ex: name=foo
  --no-header        hide table header from output
  --no-truncate      do not truncate output to fit screen
  --output=<option>  output in a more machine friendly format
                     <options: csv|json|yaml>
  --sort=<value>     property to sort by (prepend '-' for descending)

DESCRIPTION
  Lists all existing tokens added to the session

ALIASES
  $ csdx tokens

EXAMPLES
  $ csdx auth:tokens
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/main/packages/contentstack-auth/src/commands/auth/tokens/index.ts)_

## `csdx auth:tokens:add [-a <value>] [--delivery] [--management] [-e <value>] [-k <value>] [-y] [--token <value>]`

Adds management/delivery tokens to your session to use it with other CLI commands

```
USAGE
  $ csdx auth:tokens:add [-a <value>] [--delivery] [--management] [-e <value>] [-k <value>] [-y] [--token <value>]

FLAGS
  -a, --alias=<value>          Name of the token alias
  -d, --delivery               Set this flag to save delivery token
  -e, --environment=<value>    Environment name for delivery token
  -k, --stack-api-key=<value>  Stack API Key
  -m, --management             Set this flag to save management token
  -t, --token=<value>          Add the token name
  -y, --yes                    Use this flag to skip confirmation

DESCRIPTION
  Adds management/delivery tokens to your session to use it with other CLI commands

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

  $ csdx auth:tokens:add --alias <alias> --stack-api-key <stack api key> --delivery -e <environment> --token <delivery token>
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/main/packages/contentstack-auth/src/commands/auth/tokens/add.ts)_

## `csdx auth:tokens:remove`

Removes selected tokens

```
USAGE
  $ csdx auth:tokens:remove [-a <value>] [-i]

FLAGS
  -a, --alias=<value>  Token alias
  -i, --ignore         Ignore

DESCRIPTION
  Removes selected tokens

EXAMPLES
  $ csdx auth:tokens:remove

  $ csdx auth:tokens:remove -a <alias>
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/main/packages/contentstack-auth/src/commands/auth/tokens/remove.ts)_

## `csdx auth:whoami`

Display current users email address

```
USAGE
  $ csdx auth:whoami

DESCRIPTION
  Display current users email address

ALIASES
  $ csdx whoami

EXAMPLES
  $ csdx auth:whoami
```

_See code: [@contentstack/cli-auth](https://github.com/contentstack/cli/blob/main/packages/contentstack-auth/src/commands/auth/whoami.ts)_

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

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/assets/publish.js)_

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

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/assets/unpublish.js)_

## `csdx cm:bootstrap`

Bootstrap contentstack apps

```
USAGE
  $ csdx cm:bootstrap [--app-name <value>] [--project-dir <value>] [-k <value> | --org <value> | -n <value>] [-y
    <value>] [-a <value>]

FLAGS
  -a, --alias=<value>          Alias of the management token
  -k, --stack-api-key=<value>  Provide stack API key to seed content
  -n, --stack-name=<value>     Name of a new stack that will be created.
  -y, --yes=<value>            [Optional] Skip stack confirmation
  --app-name=<value>           App name, reactjs-starter, nextjs-starter, gatsby-starter, angular-starter, nuxt-starter,
                               vue-starter, stencil-starter
  --org=<value>                Provide organization UID to create a new stack
  --project-dir=<value>        Directory to setup the project. If directory name has a space then provide the path as a
                               string or escap the space using back slash eg: "../../test space" or ../../test\ space

DESCRIPTION
  Bootstrap contentstack apps

EXAMPLES
  $ csdx cm:bootstrap

  $ csdx cm:bootstrap --project-dir <path/to/setup/the/app>

  $ csdx cm:bootstrap --app-name "reactjs-starter" --project-dir <path/to/setup/the/app>

  $ csdx cm:bootstrap --app-name "reactjs-starter" --project-dir <path/to/setup/the/app> --stack-api-key "stack-api-key"

  $ csdx cm:bootstrap --app-name "reactjs-starter" --project-dir <path/to/setup/the/app> --org "your-org-uid" --stack-name "stack-name"
```

_See code: [@contentstack/cli-cm-bootstrap](https://github.com/contentstack/cli/blob/main/packages/contentstack-bootstrap/src/commands/cm/bootstrap.ts)_

## `csdx cm:branches`

List the branches

```
USAGE
  $ csdx cm:branches

FLAGS
  -k, --stack-api-key=<value>  Stack API Key
  --verbose                    Verbose

DESCRIPTION
  List the branches

EXAMPLES
  $ csdx cm:branches

  $ csdx cm:branches --verbose

  $ csdx cm:branches -k <stack api key>
```

_See code: [@contentstack/cli-cm-branches](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/branches/index.ts)_

## `csdx cm:branches:create`

Create a new branch

```
USAGE
  $ csdx cm:branches:create
  $ csdx cm:branches:create [--source <value>] [--uid <value>] [-k <value>]
  $ csdx cm:branches:create [--source <value>] [--uid <value>] [--stack-api-key <value>]

FLAGS
  -k, --stack-api-key=<value>  Stack API key
  --source=<value>             Source branch from which new branch to be created
  --uid=<value>                Branch UID to be created

DESCRIPTION
  Create a new branch

EXAMPLES
  $ csdx cm:branches:create

  $ csdx cm:branches:create --source main -uid new_branch -k bltxxxxxxxx

  $ csdx cm:branches:create --source main --uid new_branch --stack-api-key bltxxxxxxxx
```

_See code: [@contentstack/cli-cm-branches](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/branches/create.ts)_

## `csdx cm:branches:delete [-uid <value>] [-k <value>]`

Delete a branch

```
USAGE
  $ csdx cm:branches:delete [-uid <value>] [-k <value>]
  $ csdx cm:branches:delete [--uid <value>] [--stack-api-key <value>]

FLAGS
  -k, --stack-api-key=<value>  Stack API key
  -y, --yes                    Force the deletion of the branch by skipping the confirmation
  --uid=<value>                Branch UID to be deleted

DESCRIPTION
  Delete a branch

EXAMPLES
  $ csdx cm:branches:delete

  $ csdx cm:branches:delete --uid main -k bltxxxxxxxx

  $ csdx cm:branches:delete --uid main --stack-api-key bltxxxxxxxx

  $ csdx cm:branches:delete --uid main --stack-api-key bltxxxxxxxx --yes
```

_See code: [@contentstack/cli-cm-branches](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/branches/delete.ts)_

## `csdx cm:branches:diff [--base-branch <value>] [--compare-branch <value>] [-k <value>][--module <value>]`

Differences between two branches

```
USAGE
  $ csdx cm:branches:diff [--base-branch <value>] [--compare-branch <value>] [-k <value>][--module <value>]

FLAGS
  -k, --stack-api-key=<value>  Provide Stack API key to show difference between branches
  --base-branch=<value>        Base branch
  --compare-branch=<value>     Compare branch
  --format=<option>            [default: compact-text] [Optional] Type of flags to show branches differences
                               <options: compact-text|detailed-text>
  --module=<option>            Module
                               <options: content-types|global-fields|all>

DESCRIPTION
  Differences between two branches

EXAMPLES
  $ csdx cm:branches:diff

  $ csdx cm:branches:diff --stack-api-key "bltxxxxxxxx"

  $ csdx cm:branches:diff --compare-branch "develop"

  $ csdx cm:branches:diff --compare-branch "develop" --stack-api-key "bltxxxxxxxx"

  $ csdx cm:branches:diff --compare-branch "develop" --module "content-types"

  $ csdx cm:branches:diff --module "content-types" --format "detailed-text"

  $ csdx cm:branches:diff --compare-branch "develop" --format "detailed-text"

  $ csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main"

  $ csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main" --compare-branch "develop"

  $ csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main" --module "content-types"

  $ csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main" --compare-branch "develop" --module "content-types"

  $ csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main" --compare-branch "develop" --module "content-types" --format "detailed-text"
```

_See code: [@contentstack/cli-cm-branches](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/branches/diff.ts)_

## `csdx cm:branches:merge [-k <value>][--compare-branch <value>] [--no-revert] [--export-summary-path <value>] [--use-merge-summary <value>] [--comment <value>] [--base-branch <value>]`

Merge changes from a branch

```
USAGE
  $ csdx cm:branches:merge [-k <value>][--compare-branch <value>] [--no-revert] [--export-summary-path <value>]
    [--use-merge-summary <value>] [--comment <value>] [--base-branch <value>]

FLAGS
  -k, --stack-api-key=<value>    Provide Stack API key to show difference between branches
  --base-branch=<value>          Base branch
  --comment=<value>              Merge comment
  --compare-branch=<value>       Compare branch name
  --export-summary-path=<value>  Export summary file path
  --no-revert                    If passed, will not create the new revert branch
  --use-merge-summary=<value>    Path of merge summary file

DESCRIPTION
  Merge changes from a branch

EXAMPLES
  $ csdx cm:branches:merge --stack-api-key bltxxxxxxxx --compare-branch feature-branch

  $ csdx cm:branches:merge --stack-api-key bltxxxxxxxx --comment "merge comment"

  $ csdx cm:branches:merge -k bltxxxxxxxx --base-branch base-branch

  $ csdx cm:branches:merge --export-summary-path file/path

  $ csdx cm:branches:merge --use-merge-summary file-path

  $ csdx cm:branches:merge -k bltxxxxxxxx --no-revert

  $ csdx cm:branches:merge -k bltxxxxxxxx --compare-branch feature-branch --no-revert
```

_See code: [@contentstack/cli-cm-branches](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/branches/merge.ts)_

## `csdx cm:bulk-publish`

Bulk Publish script for managing entries and assets

```
USAGE
  $ csdx cm:bulk-publish

DESCRIPTION
  Bulk Publish script for managing entries and assets
```

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/index.js)_

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

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/bulk-publish/cross-publish.js)_

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

## `csdx cm:entries:migrate-html-rte`

Migration script to migrate content from HTML RTE to JSON RTE

```
USAGE
  $ csdx cm:entries:migrate-html-rte [-c <value>] [-a <value>] [--stack-api-key <value>] [--content-type <value>]
    [--global-field] [-y] [--branch <value>] [--html-path <value> --json-path <value>] [--delay <value>] [--locale
    <value>] [--batch-limit <value>]

FLAGS
  -a, --alias=<value>        Alias(name) for the management token
  -c, --config-path=<value>  Path to config file
  -y, --yes                  Agree to process the command with the current configuration
  --batch-limit=<value>      [default: 50] Provide batch limit for updating entries
  --branch=<value>           [optional] branch name
  --content-type=<value>     The content type from which entries will be migrated
  --delay=<value>            [default: 1000] Provide delay in ms between two entry update
  --global-field             This flag is set to false by default. It indicates that current content type is a
                             globalfield
  --html-path=<value>        Provide path of HTML RTE to migrate
  --json-path=<value>        Provide path of JSON RTE to migrate
  --locale=<value>           The locale from which entries will be migrated
  --stack-api-key=<value>    Stack api key to be used

DESCRIPTION
  Migration script to migrate content from HTML RTE to JSON RTE

ALIASES
  $ csdx cm:migrate-rte

EXAMPLES
  General Usage

  $ csdx cm:entries:migrate-html-rte --config-path path/to/config.json



  Using Flags

  $ csdx cm:entries:migrate-html-rte --alias alias --content-type content_type_uid --html-path html-path --json-path json-path



  Nested RTE

  $ csdx cm:entries:migrate-html-rte --alias alias --content-type content_type_uid --html-path modular_block_uid.block_uid.html_rte_uid --json-path modular_block_uid.block_uid.json_rte_uid



  $ csdx cm:entries:migrate-html-rte --alias alias --content-type content_type_uid --html-path group_uid.html_rte_uid --json-path group_uid.json_rte_uid



  Global Field

  $ csdx cm:entries:migrate-html-rte --alias alias --content-type global_field_uid --global-field --html-path html-path --json-path json-path
```

_See code: [@contentstack/cli-cm-migrate-rte](https://github.com/contentstack/cli/blob/main/packages/contentstack-migrate-rte/src/commands/cm/entries/migrate-html-rte.js)_

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

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/entries/publish.js)_

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

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/entries/publish-modified.js)_

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

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/entries/publish-non-localized-fields.js)_

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

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/entries/publish-only-unpublished.js)_

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

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/entries/unpublish.js)_

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

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/entries/update-and-publish.js)_

## `csdx cm:stacks:export [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--content-types <value>] [--branch <value>] [--secured-assets]`

Export content from a stack

```
USAGE
  $ csdx cm:stacks:export [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--content-types
    <value>] [--branch <value>] [--secured-assets]

FLAGS
  -B, --branch=<value>            [optional] branch name
  -a, --alias=<value>             alias of the management token
  -c, --config=<value>            [optional] path of the config
  -d, --data-dir=<value>          path or location to store the data
  -k, --stack-api-key=<value>     API key of the source stack
  -m, --module=<value>            [optional] specific module name
  -t, --content-types=<value>...  [optional] content type
  -y, --yes                       [optional] Override marketplace apps related prompts
  --secured-assets                [optional] use when assets are secured

DESCRIPTION
  Export content from a stack

ALIASES
  $ csdx cm:export

EXAMPLES
  $ csdx cm:stacks:export --stack-api-key <stack_api_key> --data-dir <path/of/export/destination/dir>

  $ csdx cm:stacks:export --config <path/to/config/dir>

  $ csdx cm:stacks:export --alias <management_token_alias>

  $ csdx cm:stacks:export --alias <management_token_alias> --data-dir <path/to/export/destination/dir>

  $ csdx cm:stacks:export --alias <management_token_alias> --config <path/to/config/file>

  $ csdx cm:stacks:export --module <single module name>

  $ csdx cm:stacks:export --branch [optional] branch name
```

## `csdx cm:export-to-csv`

Export entries, taxonomies, terms or organization users to csv using this command

```
USAGE
  $ csdx cm:export-to-csv [--action entries|users|teams|taxonomies] [-a <value>] [--org <value>] [-n <value>] [-k
    <value>] [--org-name <value>] [--locale <value>] [--content-type <value>] [--branch <value>] [--team-uid <value>]
    [--taxonomy-uid <value>] [--delimiter <value>]

FLAGS
  -a, --alias=<value>          Alias of the management token
  -k, --stack-api-key=<value>  API key of the source stack
  -n, --stack-name=<value>     Name of the stack that needs to be created as csv filename.
  --action=<option>            Option to export data (entries, users, teams, taxonomies)
                               <options: entries|users|teams|taxonomies>
  --branch=<value>             Branch from which entries need to be exported
  --content-type=<value>       Content type for which entries needs to be exported
  --delimiter=<value>          [default: ,] [optional] Provide a delimiter to separate individual data fields within the
                               CSV file.
  --locale=<value>             Locale for which entries need to be exported
  --org=<value>                Provide organization UID to clone org users
  --org-name=<value>           Name of the organization that needs to be created as csv filename.
  --taxonomy-uid=<value>       Provide the taxonomy UID of the related terms you want to export
  --team-uid=<value>           Uid of the team whose user data and stack roles are required

DESCRIPTION
  Export entries, taxonomies, terms or organization users to csv using this command

EXAMPLES
  $ csdx cm:export-to-csv



  Exporting entries to csv

  $ csdx cm:export-to-csv --action <entries> --locale <locale> --alias <management-token-alias> --content-type <content-type>



  Exporting entries to csv with stack name provided and branch name provided

  $ csdx cm:export-to-csv --action <entries> --locale <locale> --alias <management-token-alias> --content-type <content-type> --stack-name <stack-name> --branch <branch-name>



  Exporting organization users to csv

  $ csdx cm:export-to-csv --action <users> --org <org-uid>



  Exporting organization users to csv with organization name provided

  $ csdx cm:export-to-csv --action <users> --org <org-uid> --org-name <org-name>



  Exporting Organizations Teams to CSV

  $ csdx cm:export-to-csv --action <teams>



  Exporting Organizations Teams to CSV with org-uid

  $ csdx cm:export-to-csv --action <teams> --org <org-uid>



  Exporting Organizations Teams to CSV with team uid

  $ csdx cm:export-to-csv --action <teams> --team-uid <team-uid>



  Exporting Organizations Teams to CSV with org-uid and team uid

  $ csdx cm:export-to-csv --action <teams> --org <org-uid> --team-uid <team-uid>



  Exporting Organizations Teams to CSV with org-uid and team uid

  $ csdx cm:export-to-csv --action <teams> --org <org-uid> --team-uid <team-uid> --org-name <org-name>



  Exporting taxonomies and related terms to a .CSV file with the provided taxonomy UID

  $ csdx cm:export-to-csv --action <taxonomies> --alias <management-token-alias> --taxonomy-uid <taxonomy-uid>



  Exporting taxonomies and respective terms to a .CSV file

  $ csdx cm:export-to-csv --action <taxonomies> --alias <management-token-alias>



  Exporting taxonomies and respective terms to a .CSV file with a delimiter

  $ csdx cm:export-to-csv --action <taxonomies> --alias <management-token-alias> --delimiter <delimiter>
```

_See code: [@contentstack/cli-cm-export-to-csv](https://github.com/contentstack/cli/blob/main/packages/contentstack-export-to-csv/src/commands/cm/export-to-csv.js)_

## `csdx cm:stacks:import [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--backup-dir <value>] [--branch <value>] [--import-webhook-status disable|current]`

Import content from a stack

```
USAGE
  $ csdx cm:stacks:import [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--backup-dir <value>]
    [--branch <value>] [--import-webhook-status disable|current]

FLAGS
  -B, --branch=<value>              [optional] branch name
  -a, --alias=<value>               alias of the management token
  -b, --backup-dir=<value>          [optional] backup directory name when using specific module
  -c, --config=<value>              [optional] path of config file
  -d, --data-dir=<value>            path and location where data is stored
  -k, --stack-api-key=<value>       API key of the target stack
  -m, --module=<value>              [optional] specific module name
  -y, --yes                         [optional] Override marketplace prompts
  --import-webhook-status=<option>  [default: disable] [optional] Webhook state
                                    <options: disable|current>
  --replace-existing                Replaces the existing module in the target stack.
  --skip-existing                   Skips the module exists warning messages.

DESCRIPTION
  Import content from a stack

ALIASES
  $ csdx cm:import

EXAMPLES
  $ csdx cm:stacks:import --stack-api-key <stack_api_key> --data-dir <path/of/export/destination/dir>

  $ csdx cm:stacks:import --config <path/of/config/dir>

  $ csdx cm:stacks:import --module <single module name>

  $ csdx cm:stacks:import --module <single module name> --backup-dir <backup dir>

  $ csdx cm:stacks:import --alias <management_token_alias>

  $ csdx cm:stacks:import --alias <management_token_alias> --data-dir <path/of/export/destination/dir>

  $ csdx cm:stacks:import --alias <management_token_alias> --config <path/of/config/file>

  $ csdx cm:stacks:import --branch <branch name>  --yes
```

## `csdx cm:migrate-rte`

Migration script to migrate content from HTML RTE to JSON RTE

```
USAGE
  $ csdx cm:migrate-rte [-c <value>] [-a <value>] [--stack-api-key <value>] [--content-type <value>]
    [--global-field] [-y] [--branch <value>] [--html-path <value> --json-path <value>] [--delay <value>] [--locale
    <value>] [--batch-limit <value>]

FLAGS
  -a, --alias=<value>        Alias(name) for the management token
  -c, --config-path=<value>  Path to config file
  -y, --yes                  Agree to process the command with the current configuration
  --batch-limit=<value>      [default: 50] Provide batch limit for updating entries
  --branch=<value>           [optional] branch name
  --content-type=<value>     The content type from which entries will be migrated
  --delay=<value>            [default: 1000] Provide delay in ms between two entry update
  --global-field             This flag is set to false by default. It indicates that current content type is a
                             globalfield
  --html-path=<value>        Provide path of HTML RTE to migrate
  --json-path=<value>        Provide path of JSON RTE to migrate
  --locale=<value>           The locale from which entries will be migrated
  --stack-api-key=<value>    Stack api key to be used

DESCRIPTION
  Migration script to migrate content from HTML RTE to JSON RTE

ALIASES
  $ csdx cm:migrate-rte

EXAMPLES
  General Usage

  $ csdx cm:entries:migrate-html-rte --config-path path/to/config.json



  Using Flags

  $ csdx cm:entries:migrate-html-rte --alias alias --content-type content_type_uid --html-path html-path --json-path json-path



  Nested RTE

  $ csdx cm:entries:migrate-html-rte --alias alias --content-type content_type_uid --html-path modular_block_uid.block_uid.html_rte_uid --json-path modular_block_uid.block_uid.json_rte_uid



  $ csdx cm:entries:migrate-html-rte --alias alias --content-type content_type_uid --html-path group_uid.html_rte_uid --json-path group_uid.json_rte_uid



  Global Field

  $ csdx cm:entries:migrate-html-rte --alias alias --content-type global_field_uid --global-field --html-path html-path --json-path json-path
```

## `csdx cm:stacks:migration [-k <value>] [-a <value>] [--file-path <value>] [--branch <value>] [--config-file <value>] [--config <value>] [--multiple]`

Contentstack migration script.

```
USAGE
  $ csdx cm:stacks:migration [-k <value>] [-a <value>] [--file-path <value>] [--branch <value>] [--config-file <value>]
    [--config <value>] [--multiple]

FLAGS
  -B, --branch=<value>         Use this flag to add the branch name where you want to perform the migration.
  -a, --alias=<value>          Use this flag to add the management token alias.
  -k, --stack-api-key=<value>  With this flag add the API key of your stack.
  --config=<value>...          [optional] inline configuration, <key1>:<value1>
  --config-file=<value>        [optional] Path of the JSON configuration file
  --file-path=<value>          Use this flag to provide the path of the file of the migration script provided by the
                               user.
  --multiple                   This flag helps you to migrate multiple content files in a single instance.

DESCRIPTION
  Contentstack migration script.

ALIASES
  $ csdx cm:migration

EXAMPLES
  $ csdx cm:migration --file-path <migration/script/file/path> -k <api-key>

  $ csdx cm:migration --file-path <migration/script/file/path> -k <api-key> --branch <target branch name>

  $ csdx cm:migration --config <key1>:<value1> <key2>:<value2> ... --file-path <migration/script/file/path>

  $ csdx cm:migration --config-file <path/to/json/config/file> --file-path <migration/script/file/path>

  $ csdx cm:migration --multiple --file-path <migration/scripts/dir/path> 

  $ csdx cm:migration --alias --file-path <migration/script/file/path> -k <api-key>
```

## `csdx cm:stacks:seed [--repo <value>] [--org <value>] [-k <value>] [-n <value>] [-y <value>] [-s <value>]`

Create a stack from existing content types, entries, assets, etc

```
USAGE
  $ csdx cm:stacks:seed [--repo <value>] [--org <value>] [-k <value>] [-n <value>] [-y <value>] [-s <value>]

FLAGS
  -a, --alias=<value>          Alias of the management token
  -k, --stack-api-key=<value>  Provide stack api key to seed content to
  -n, --stack-name=<value>     Name of a new stack that needs to be created.
  -o, --org=<value>            Provide Organization UID to create a new stack
  -r, --repo=<value>           GitHub account or GitHub account/repository
  -s, --stack=<value>          Provide stack UID to seed content to
  -y, --yes=<value>            [Optional] Skip stack confirmation

DESCRIPTION
  Create a stack from existing content types, entries, assets, etc

ALIASES
  $ csdx cm:seed

EXAMPLES
  $ csdx cm:stacks:seed

  $ csdx cm:stacks:seed --repo "account"

  $ csdx cm:stacks:seed --repo "account/repository"

  $ csdx cm:stacks:seed --repo "account/repository" --stack-api-key "stack-api-key" //seed content into specific stack

  $ csdx cm:stacks:seed --repo "account/repository" --org "your-org-uid" --stack-name "stack-name" //create a new stack in given org uid
```

## `csdx cm:stacks:clone [--source-branch <value>] [--target-branch <value>] [--source-management-token-alias <value>] [--destination-management-token-alias <value>] [-n <value>] [--type a|b] [--source-stack-api-key <value>] [--destination-stack-api-key <value>] [--import-webhook-status disable|current]`

Clone data (structure/content or both) of a stack into another stack

```
USAGE
  $ csdx cm:stacks:clone [--source-branch <value>] [--target-branch <value>] [--source-management-token-alias <value>]
    [--destination-management-token-alias <value>] [-n <value>] [--type a|b] [--source-stack-api-key <value>]
    [--destination-stack-api-key <value>] [--import-webhook-status disable|current]

FLAGS
  -n, --stack-name=<value>                      Name for the new stack to store the cloned content.
  -y, --yes                                     [Optional] Override marketplace prompts
  --destination-management-token-alias=<value>  Source API key of the target stack token alias.
  --destination-stack-api-key=<value>           Destination stack API Key
  --import-webhook-status=<option>              [default: disable] [Optional] Webhook state
                                                <options: disable|current>
  --source-branch=<value>                       Branch of the source stack.
  --source-management-token-alias=<value>       Source API key of the target stack token alias.
  --source-stack-api-key=<value>                Source stack API Key
  --target-branch=<value>                       Branch of the target stack.
  --type=<option>                               Type of data to clone
                                                a) Structure (all modules except entries & assets)
                                                b) Structure with content (all modules including entries & assets)

                                                <options: a|b>

DESCRIPTION
  Clone data (structure/content or both) of a stack into another stack
  Use this plugin to automate the process of cloning a stack in few steps.


ALIASES
  $ csdx cm:stack-clone

EXAMPLES
  $ csdx cm:stacks:clone

  $ csdx cm:stacks:clone --source-branch <source-branch-name> --target-branch <target-branch-name> --yes

  $ csdx cm:stacks:clone --source-stack-api-key <apiKey> --destination-stack-api-key <apiKey>

  $ csdx cm:stacks:clone --source-management-token-alias <management token alias> --destination-management-token-alias <management token alias>

  $ csdx cm:stacks:clone --source-branch --target-branch --source-management-token-alias <management token alias> --destination-management-token-alias <management token alias>

  $ csdx cm:stacks:clone --source-branch --target-branch --source-management-token-alias <management token alias> --destination-management-token-alias <management token alias> --type <value a or b>
```

## `csdx cm:stacks:audit`

Perform audits and find possible errors in the exported Contentstack data

```
USAGE
  $ csdx cm:stacks:audit [-c <value>] [-d <value>] [--report-path <value>] [--modules
    content-types|global-fields|entries] [--columns <value> | ] [--sort <value>] [--filter <value>] [--csv |
    --no-truncate]

FLAGS
  --modules=<option>...  Provide the list of modules to be audited
                         <options: content-types|global-fields|entries>
  --report-path=<value>  Path to store the audit reports

COMMON FLAGS
  -c, --config=<value>    Path of the external config
  -d, --data-dir=<value>  Path where the data is stored

TABLE FLAGS
  --columns=<value>  Show only the specified columns (comma-separated)
  --csv              The output is in the CSV format [alias: --output=csv]
  --filter=<value>   Filter property by partial string matching. For example: name=foo
  --no-truncate      The output is not truncated to fit the screen
  --sort=<value>     Property to sort by (prepend '-' for descending)

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

_See code: [@contentstack/cli-audit](https://github.com/contentstack/audit/blob/main/packages/contentstack-audit/src/commands/cm/stacks/audit/index.ts)_

## `csdx cm:stacks:audit:fix`

Perform audits and fix possible errors in the exported Contentstack data.

```
USAGE
  $ csdx cm:stacks:audit:fix [-c <value>] [-d <value>] [--report-path <value>] [--modules
    content-types|global-fields|entries] [--copy-path <value> --copy-dir] [--fix-only
    reference|global_field|json:rte|json:custom-field|blocks|group] [--columns <value> | ] [--sort <value>] [--filter
    <value>] [--csv | --no-truncate]

FLAGS
  --copy-dir              Create backup from the original data.
  --copy-path=<value>     Provide the path to backup the copied data
  --fix-only=<option>...  Provide the list of fix options
                          <options: reference|global_field|json:rte|json:custom-field|blocks|group>
  --modules=<option>...   Provide the list of modules to be audited
                          <options: content-types|global-fields|entries>
  --report-path=<value>   Path to store the audit reports

COMMON FLAGS
  -c, --config=<value>    Path of the external config
  -d, --data-dir=<value>  Path where the data is stored

TABLE FLAGS
  --columns=<value>  Show only the specified columns (comma-separated)
  --csv              The output is in the CSV format [alias: --output=csv]
  --filter=<value>   Filter property by partial string matching. For example: name=foo
  --no-truncate      The output is not truncated to fit the screen
  --sort=<value>     Property to sort by (prepend '-' for descending)

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

_See code: [@contentstack/cli-audit](https://github.com/contentstack/audit/blob/main/packages/contentstack-audit/src/commands/cm/stacks/audit/fix.ts)_

## `csdx cm:stacks:clone [--source-branch <value>] [--target-branch <value>] [--source-management-token-alias <value>] [--destination-management-token-alias <value>] [-n <value>] [--type a|b] [--source-stack-api-key <value>] [--destination-stack-api-key <value>] [--import-webhook-status disable|current]`

Clone data (structure/content or both) of a stack into another stack

```
USAGE
  $ csdx cm:stacks:clone [--source-branch <value>] [--target-branch <value>] [--source-management-token-alias <value>]
    [--destination-management-token-alias <value>] [-n <value>] [--type a|b] [--source-stack-api-key <value>]
    [--destination-stack-api-key <value>] [--import-webhook-status disable|current]

FLAGS
  -n, --stack-name=<value>                      Name for the new stack to store the cloned content.
  -y, --yes                                     [Optional] Override marketplace prompts
  --destination-management-token-alias=<value>  Source API key of the target stack token alias.
  --destination-stack-api-key=<value>           Destination stack API Key
  --import-webhook-status=<option>              [default: disable] [Optional] Webhook state
                                                <options: disable|current>
  --source-branch=<value>                       Branch of the source stack.
  --source-management-token-alias=<value>       Source API key of the target stack token alias.
  --source-stack-api-key=<value>                Source stack API Key
  --target-branch=<value>                       Branch of the target stack.
  --type=<option>                               Type of data to clone
                                                a) Structure (all modules except entries & assets)
                                                b) Structure with content (all modules including entries & assets)

                                                <options: a|b>

DESCRIPTION
  Clone data (structure/content or both) of a stack into another stack
  Use this plugin to automate the process of cloning a stack in few steps.


ALIASES
  $ csdx cm:stack-clone

EXAMPLES
  $ csdx cm:stacks:clone

  $ csdx cm:stacks:clone --source-branch <source-branch-name> --target-branch <target-branch-name> --yes

  $ csdx cm:stacks:clone --source-stack-api-key <apiKey> --destination-stack-api-key <apiKey>

  $ csdx cm:stacks:clone --source-management-token-alias <management token alias> --destination-management-token-alias <management token alias>

  $ csdx cm:stacks:clone --source-branch --target-branch --source-management-token-alias <management token alias> --destination-management-token-alias <management token alias>

  $ csdx cm:stacks:clone --source-branch --target-branch --source-management-token-alias <management token alias> --destination-management-token-alias <management token alias> --type <value a or b>
```

_See code: [@contentstack/cli-cm-clone](https://github.com/contentstack/cli/blob/main/packages/contentstack-clone/src/commands/cm/stacks/clone.js)_

## `csdx cm:stacks:export [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--content-types <value>] [--branch <value>] [--secured-assets]`

Export content from a stack

```
USAGE
  $ csdx cm:stacks:export [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--content-types
    <value>] [--branch <value>] [--secured-assets]

FLAGS
  -B, --branch=<value>            [optional] branch name
  -a, --alias=<value>             alias of the management token
  -c, --config=<value>            [optional] path of the config
  -d, --data-dir=<value>          path or location to store the data
  -k, --stack-api-key=<value>     API key of the source stack
  -m, --module=<value>            [optional] specific module name
  -t, --content-types=<value>...  [optional] content type
  -y, --yes                       [optional] Override marketplace apps related prompts
  --secured-assets                [optional] use when assets are secured

DESCRIPTION
  Export content from a stack

ALIASES
  $ csdx cm:export

EXAMPLES
  $ csdx cm:stacks:export --stack-api-key <stack_api_key> --data-dir <path/of/export/destination/dir>

  $ csdx cm:stacks:export --config <path/to/config/dir>

  $ csdx cm:stacks:export --alias <management_token_alias>

  $ csdx cm:stacks:export --alias <management_token_alias> --data-dir <path/to/export/destination/dir>

  $ csdx cm:stacks:export --alias <management_token_alias> --config <path/to/config/file>

  $ csdx cm:stacks:export --module <single module name>

  $ csdx cm:stacks:export --branch [optional] branch name
```

_See code: [@contentstack/cli-cm-export](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/stacks/export.ts)_

## `csdx cm:stacks:import [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--backup-dir <value>] [--branch <value>] [--import-webhook-status disable|current]`

Import content from a stack

```
USAGE
  $ csdx cm:stacks:import [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--backup-dir <value>]
    [--branch <value>] [--import-webhook-status disable|current]

FLAGS
  -B, --branch=<value>              [optional] branch name
  -a, --alias=<value>               alias of the management token
  -b, --backup-dir=<value>          [optional] backup directory name when using specific module
  -c, --config=<value>              [optional] path of config file
  -d, --data-dir=<value>            path and location where data is stored
  -k, --stack-api-key=<value>       API key of the target stack
  -m, --module=<value>              [optional] specific module name
  -y, --yes                         [optional] Override marketplace prompts
  --import-webhook-status=<option>  [default: disable] [optional] Webhook state
                                    <options: disable|current>
  --replace-existing                Replaces the existing module in the target stack.
  --skip-existing                   Skips the module exists warning messages.

DESCRIPTION
  Import content from a stack

ALIASES
  $ csdx cm:import

EXAMPLES
  $ csdx cm:stacks:import --stack-api-key <stack_api_key> --data-dir <path/of/export/destination/dir>

  $ csdx cm:stacks:import --config <path/of/config/dir>

  $ csdx cm:stacks:import --module <single module name>

  $ csdx cm:stacks:import --module <single module name> --backup-dir <backup dir>

  $ csdx cm:stacks:import --alias <management_token_alias>

  $ csdx cm:stacks:import --alias <management_token_alias> --data-dir <path/of/export/destination/dir>

  $ csdx cm:stacks:import --alias <management_token_alias> --config <path/of/config/file>

  $ csdx cm:stacks:import --branch <branch name>  --yes
```

_See code: [@contentstack/cli-cm-import](https://github.com/contentstack/cli/blob/main/packages/contentstack-import/src/commands/cm/stacks/import.ts)_

## `csdx cm:stacks:migration [-k <value>] [-a <value>] [--file-path <value>] [--branch <value>] [--config-file <value>] [--config <value>] [--multiple]`

Contentstack migration script.

```
USAGE
  $ csdx cm:stacks:migration [-k <value>] [-a <value>] [--file-path <value>] [--branch <value>] [--config-file <value>]
    [--config <value>] [--multiple]

FLAGS
  -B, --branch=<value>         Use this flag to add the branch name where you want to perform the migration.
  -a, --alias=<value>          Use this flag to add the management token alias.
  -k, --stack-api-key=<value>  With this flag add the API key of your stack.
  --config=<value>...          [optional] inline configuration, <key1>:<value1>
  --config-file=<value>        [optional] Path of the JSON configuration file
  --file-path=<value>          Use this flag to provide the path of the file of the migration script provided by the
                               user.
  --multiple                   This flag helps you to migrate multiple content files in a single instance.

DESCRIPTION
  Contentstack migration script.

ALIASES
  $ csdx cm:migration

EXAMPLES
  $ csdx cm:migration --file-path <migration/script/file/path> -k <api-key>

  $ csdx cm:migration --file-path <migration/script/file/path> -k <api-key> --branch <target branch name>

  $ csdx cm:migration --config <key1>:<value1> <key2>:<value2> ... --file-path <migration/script/file/path>

  $ csdx cm:migration --config-file <path/to/json/config/file> --file-path <migration/script/file/path>

  $ csdx cm:migration --multiple --file-path <migration/scripts/dir/path> 

  $ csdx cm:migration --alias --file-path <migration/script/file/path> -k <api-key>
```

_See code: [@contentstack/cli-migration](https://github.com/contentstack/cli/blob/main/packages/contentstack-migration/src/commands/cm/stacks/migration.js)_

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

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/stacks/publish.js)_

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

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/stacks/publish-clear-logs.js)_

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

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/stacks/publish-configure.js)_

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

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/stacks/publish-revert.js)_

## `csdx cm:stacks:seed [--repo <value>] [--org <value>] [-k <value>] [-n <value>] [-y <value>] [-s <value>]`

Create a stack from existing content types, entries, assets, etc

```
USAGE
  $ csdx cm:stacks:seed [--repo <value>] [--org <value>] [-k <value>] [-n <value>] [-y <value>] [-s <value>]

FLAGS
  -a, --alias=<value>          Alias of the management token
  -k, --stack-api-key=<value>  Provide stack api key to seed content to
  -n, --stack-name=<value>     Name of a new stack that needs to be created.
  -o, --org=<value>            Provide Organization UID to create a new stack
  -r, --repo=<value>           GitHub account or GitHub account/repository
  -s, --stack=<value>          Provide stack UID to seed content to
  -y, --yes=<value>            [Optional] Skip stack confirmation

DESCRIPTION
  Create a stack from existing content types, entries, assets, etc

ALIASES
  $ csdx cm:seed

EXAMPLES
  $ csdx cm:stacks:seed

  $ csdx cm:stacks:seed --repo "account"

  $ csdx cm:stacks:seed --repo "account/repository"

  $ csdx cm:stacks:seed --repo "account/repository" --stack-api-key "stack-api-key" //seed content into specific stack

  $ csdx cm:stacks:seed --repo "account/repository" --org "your-org-uid" --stack-name "stack-name" //create a new stack in given org uid
```

_See code: [@contentstack/cli-cm-seed](https://github.com/contentstack/cli/blob/main/packages/contentstack-seed/src/commands/cm/stacks/seed.ts)_

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

_See code: [@contentstack/cli-cm-bulk-publish](https://github.com/contentstack/cli/blob/main/packages/contentstack-bulk-publish/src/commands/cm/stacks/unpublish.js)_

## `csdx config:get:base-branch`

Get current branch set for CLI

```
USAGE
  $ csdx config:get:base-branch

DESCRIPTION
  Get current branch set for CLI

EXAMPLES
  $ csdx config:get:base-branch
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/get/base-branch.ts)_

## `csdx config:get:early-access-header`

Display early access headers

```
USAGE
  $ csdx config:get:early-access-header

DESCRIPTION
  Display early access headers

EXAMPLES
  $ csdx config:get:early-access-header
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/get/early-access-header.ts)_

## `csdx config:get:region`

Get current region set for CLI

```
USAGE
  $ csdx config:get:region

DESCRIPTION
  Get current region set for CLI

EXAMPLES
  $ csdx config:get:region
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/get/region.ts)_

## `csdx config:remove:base-branch`

Remove branch config for CLI

```
USAGE
  $ csdx config:remove:base-branch [-k <value>] [-y]

FLAGS
  -k, --stack-api-key=<value>  Stack API Key
  -y, --yes                    Force Remove

DESCRIPTION
  Remove branch config for CLI

EXAMPLES
  $ csdx config:remove:base-branch

  $ csdx config:remove:base-branch --stack-api-key <value>
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/remove/base-branch.ts)_

## `csdx config:remove:early-access-header`

Remove early access header

```
USAGE
  $ csdx config:remove:early-access-header [--header-alias <value>] [-y]

FLAGS
  -y, --yes               Force Remove
  --header-alias=<value>  Early access header alias

DESCRIPTION
  Remove early access header

EXAMPLES
  $ csdx config:remove:early-access-header

  $ csdx config:remove:early-access-header --header-alias <value>
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/remove/early-access-header.ts)_

## `csdx config:set:base-branch`

Set branch for CLI

```
USAGE
  $ csdx config:set:base-branch [-k <value>] [--base-branch <value>]

FLAGS
  -k, --stack-api-key=<value>  Stack API Key
  --base-branch=<value>        Base Branch

DESCRIPTION
  Set branch for CLI

EXAMPLES
  $ csdx config:set:base-branch

  $ csdx config:set:base-branch --stack-api-key <value> --base-branch <value>
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/set/base-branch.ts)_

## `csdx config:set:early-access-header`

Set early access header

```
USAGE
  $ csdx config:set:early-access-header [--header-alias <value>] [--header <value>]

FLAGS
  --header=<value>        Early access header value
  --header-alias=<value>  Alias for the header

DESCRIPTION
  Set early access header

EXAMPLES
  $ csdx config:set:early-access-header

  $ csdx config:set:early-access-header --header <value> --header-alias <value>
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/set/early-access-header.ts)_

## `csdx config:set:region [REGION]`

Set region for CLI

```
USAGE
  $ csdx config:set:region [REGION] [-d <value> -m <value> --ui-host <value> -n <value>]

ARGUMENTS
  REGION  Name for the region

FLAGS
  -d, --cda=<value>   Custom host to set for content delivery API, if this flag is added then cma, ui-host and name
                      flags are required
  -m, --cma=<value>   Custom host to set for content management API, , if this flag is added then cda, ui-host and name
                      flags are required
  -n, --name=<value>  Name for the region, if this flag is added then cda, cma and ui-host flags are required
  --ui-host=<value>   Custom UI host to set for CLI, if this flag is added then cda, cma and name flags are required

DESCRIPTION
  Set region for CLI

EXAMPLES
  $ csdx config:set:region

  $ csdx config:set:region NA

  $ csdx config:set:region EU

  $ csdx config:set:region AZURE-NA

  $ csdx config:set:region AZURE-EU

  $ csdx config:set:region --cma <contentstack_cma_endpoint> --cda <contentstack_cda_endpoint> --ui-host <contentstack_ui_host_endpoint> --name "India"
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/set/region.ts)_

## `csdx help [COMMANDS]`

Display help for csdx.

```
USAGE
  $ csdx help [COMMANDS] [-n]

ARGUMENTS
  COMMANDS  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for csdx.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.2.14/src/commands/help.ts)_

## `csdx launch`

Launch related operations

```
USAGE
  $ csdx launch [-d <value>] [-c <value>] [--type GitHub|FileUpload] [--framework Gatsby|NextJs|Other]
    [--org <value>] [-n <value>] [-e <value>] [--branch <value>] [--build-command <value>] [--out-dir <value>] [--init]

FLAGS
  -c, --config=<value>       Path to the local '.cs-launch.json' file
  -d, --data-dir=<value>     Current working directory
  -e, --environment=<value>  [Optional] Environment name for the Launch project
  -n, --name=<value>         [Optional] Name of the project
  --branch=<value>           [Optional] GitHub branch name
  --build-command=<value>    [Optional] Build Command
  --framework=<option>       [Optional] Type of framework
                             <options: Gatsby|NextJs|Other>
  --init                     [Optional, Hidden] Reinitialize the project if it is an existing launch project.
  --org=<value>              [Optional] Provide the organization UID to create a new project or deployment
  --out-dir=<value>          [Optional] Output Directory
  --type=<option>            [Optional] Choose the type of adapters
                             <options: GitHub|FileUpload>

DESCRIPTION
  Launch related operations

EXAMPLES
  $ csdx launch

  $ csdx launch --data-dir <path/of/current/working/dir>

  $ csdx launch --config <path/to/launch/config/file>

  $ csdx launch --type <options: GitHub|FileUpload>

  $ csdx launch --data-dir <path/of/current/working/dir> --type <options: GitHub|FileUpload>

  $ csdx launch --config <path/to/launch/config/file> --type <options: GitHub|FileUpload>

  $ csdx launch --config <path/to/launch/config/file> --type <options: GitHub|FileUpload> --name=<value> --environment=<value> --branch=<value> --build-command=<value> --framework=<option> --org=<value> --out-dir=<value>
```

_See code: [@contentstack/cli-launch](https://github.com/contentstack/cli/blob/main/packages/contentstack-launch/dist/commands/launch/index.ts)_

## `csdx launch:deployments`

Show list of deployments for an environment

```
USAGE
  $ csdx launch:deployments [-d <value>] [-c <value>] [--org <value>] [--project <value>] [-e <value>]

FLAGS
  -c, --config=<value>       Path to the local '.cs-launch.json' file
  -d, --data-dir=<value>     Current working directory
  -e, --environment=<value>  Environment name or UID
  --org=<value>              [Optional] Provide the organization UID
  --project=<value>          [Optional] Provide the project UID

DESCRIPTION
  Show list of deployments for an environment

EXAMPLES
  $ csdx launch:deployments

  $ csdx launch:deployments -d "current working directory"

  $ csdx launch:deployments -c "path to the local config file"

  $ csdx launch:deployments -e "environment number or uid" --org=<org UID> --project=<Project UID>
```

_See code: [@contentstack/cli-launch](https://github.com/contentstack/cli/blob/main/packages/contentstack-launch/dist/commands/launch/deployments.ts)_

## `csdx launch:environments`

Show list of environments for a project

```
USAGE
  $ csdx launch:environments [-d <value>] [-c <value>] [--org <value>] [--project <value>]

FLAGS
  -c, --config=<value>    Path to the local '.cs-launch.json' file
  -d, --data-dir=<value>  Current working directory
  --org=<value>           [Optional] Provide the organization UID
  --project=<value>       [Optional] Provide the project UID

DESCRIPTION
  Show list of environments for a project

EXAMPLES
  $ csdx launch:environments

  $ csdx launch:environments -d "current working directory"

  $ csdx launch:environments -c "path to the local config file"

  $ csdx launch:environments --org=<org UID> --project=<Project UID>
```

_See code: [@contentstack/cli-launch](https://github.com/contentstack/cli/blob/main/packages/contentstack-launch/dist/commands/launch/environments.ts)_

## `csdx launch:functions`

Serve cloud functions

```
USAGE
  $ csdx launch:functions [-d <value>] [-c <value>] [-p <value>]

FLAGS
  -c, --config=<value>    Path to the local '.cs-launch.json' file
  -d, --data-dir=<value>  Current working directory
  -p, --port=<value>      [default: 3000] Port number

DESCRIPTION
  Serve cloud functions

EXAMPLES
  $ csdx launch:functions

  $ csdx launch:functions --port=port

  $ csdx launch:functions --data-dir <path/of/current/working/dir>

  $ csdx launch:functions --config <path/to/launch/config/file>

  $ csdx launch:functions --data-dir <path/of/current/working/dir> -p "port number"

  $ csdx launch:functions --config <path/to/launch/config/file> --port=port
```

_See code: [@contentstack/cli-launch](https://github.com/contentstack/cli/blob/main/packages/contentstack-launch/dist/commands/launch/functions.ts)_

## `csdx launch:logs`

Show deployment or server logs

```
USAGE
  $ csdx launch:logs [-d <value>] [-c <value>] [-e <value>] [--deployment <value>] [--type d|s] [--org <value>]
    [--project <value>]

FLAGS
  -c, --config=<value>       Path to the local '.cs-launch.json' file
  -d, --data-dir=<value>     Current working directory
  -e, --environment=<value>  Environment name or UID
  --deployment=<value>       Deployment number or UID
  --org=<value>              [Optional] Provide the organization UID
  --project=<value>          [Optional] Provide the project UID
  --type=<option>            [default: s] Choose type of flags to show logs
                             d) Deployment logs
                             s) Server logs

                             <options: d|s>

DESCRIPTION
  Show deployment or server logs

EXAMPLES
  $ csdx launch:logs

  $ csdx launch:logs --data-dir <path/of/current/working/dir>

  $ csdx launch:logs --data-dir <path/of/current/working/dir> --type <options: d|s>

  $ csdx launch:logs --config <path/to/launch/config/file> --type <options: d|s>

  $ csdx launch:logs --deployment=deployment

  $ csdx launch:logs --environment=environment

  $ csdx launch:logs --environment=environment --deployment=deployment

  $ csdx launch:logs --environment=environment --type <options: d|s>

  $ csdx launch:logs --environment=environment --data-dir <path/of/current/working/dir> --deployment=deployment

  $ csdx launch:logs --environment=environment --config <path/to/launch/config/file> --deployment=deployment
```

_See code: [@contentstack/cli-launch](https://github.com/contentstack/cli/blob/main/packages/contentstack-launch/dist/commands/launch/logs.ts)_

## `csdx launch:open`

Open a website for an environment

```
USAGE
  $ csdx launch:open [-d <value>] [-c <value>] [--org <value>] [--project <value>] [-e <value>]

FLAGS
  -c, --config=<value>       Path to the local '.cs-launch.json' file
  -d, --data-dir=<value>     Current working directory
  -e, --environment=<value>  Environment name or UID
  --org=<value>              [Optional] Provide the organization UID
  --project=<value>          [Optional] Provide the project UID

DESCRIPTION
  Open a website for an environment

EXAMPLES
  $ csdx launch:open

  $ csdx launch:open --config <path/to/launch/config/file>

  $ csdx launch:open --data-dir <path/of/current/working/dir>

  $ csdx launch:open --environment=environment

  $ csdx launch:open --environment=environment --config <path/to/launch/config/file>

  $ csdx launch:open --environment=environment --data-dir <path/of/current/working/dir>
```

_See code: [@contentstack/cli-launch](https://github.com/contentstack/cli/blob/main/packages/contentstack-launch/dist/commands/launch/open.ts)_

## `csdx login`

User sessions login

```
USAGE
  $ csdx login [-u <value> | --oauth] [-p <value> | ]

FLAGS
  -p, --password=<value>  Password
  -u, --username=<value>  User name
  --oauth                 Enables single sign-on (SSO) in Contentstack CLI

DESCRIPTION
  User sessions login

ALIASES
  $ csdx login

EXAMPLES
  $ csdx auth:login

  $ csdx auth:login -u <username>

  $ csdx auth:login -u <username> -p <password>

  $ csdx auth:login --username <username>

  $ csdx auth:login --username <username> --password <password>
```

## `csdx logout`

User session logout

```
USAGE
  $ csdx logout [-y]

FLAGS
  -y, --yes  Force log out by skipping the confirmation

DESCRIPTION
  User session logout

ALIASES
  $ csdx logout

EXAMPLES
  $ csdx auth:logout

  $ csdx auth:logout -y

  $ csdx auth:logout --yes
```

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v3.8.4/src/commands/plugins/index.ts)_

## `csdx plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ csdx plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.
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

## `csdx plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ csdx plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v3.8.4/src/commands/plugins/inspect.ts)_

## `csdx plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ csdx plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.
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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v3.8.4/src/commands/plugins/install.ts)_

## `csdx plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ csdx plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Links a plugin into the CLI for development.
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ csdx plugins:link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v3.8.4/src/commands/plugins/link.ts)_

## `csdx plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ csdx plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ csdx plugins:unlink
  $ csdx plugins:remove
```

## `csdx plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ csdx plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ csdx plugins:unlink
  $ csdx plugins:remove
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v3.8.4/src/commands/plugins/uninstall.ts)_

## `csdx plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ csdx plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ csdx plugins:unlink
  $ csdx plugins:remove
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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v3.8.4/src/commands/plugins/update.ts)_

## `csdx tokens`

Lists all existing tokens added to the session

```
USAGE
  $ csdx tokens [--columns <value> | -x] [--sort <value>] [--filter <value>] [--output csv|json|yaml |  |
    [--csv | --no-truncate]] [--no-header | ]

FLAGS
  -x, --extended     show extra columns
  --columns=<value>  only show provided columns (comma-separated)
  --csv              output is csv format [alias: --output=csv]
  --filter=<value>   filter property by partial string matching, ex: name=foo
  --no-header        hide table header from output
  --no-truncate      do not truncate output to fit screen
  --output=<option>  output in a more machine friendly format
                     <options: csv|json|yaml>
  --sort=<value>     property to sort by (prepend '-' for descending)

DESCRIPTION
  Lists all existing tokens added to the session

ALIASES
  $ csdx tokens

EXAMPLES
  $ csdx auth:tokens
```

## `csdx whoami`

Display current users email address

```
USAGE
  $ csdx whoami

DESCRIPTION
  Display current users email address

ALIASES
  $ csdx whoami

EXAMPLES
  $ csdx auth:whoami
```
<!-- commandsstop -->

```

```
