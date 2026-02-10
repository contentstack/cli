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
@contentstack/cli/2.0.0-beta.9 darwin-arm64 node-v24.12.0
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
* [`csdx auth:tokens:add [-a <value>] [--delivery] [--management] [-e <value>] [-k <value>] [-y] [--token <value>]`](#csdx-authtokensadd--a-value---delivery---management--e-value--k-value--y---token-value)
* [`csdx auth:tokens:remove`](#csdx-authtokensremove)
* [`csdx auth:whoami`](#csdx-authwhoami)
* [`csdx cm:bootstrap`](#csdx-cmbootstrap)
* [`csdx cm:branches`](#csdx-cmbranches)
* [`csdx cm:branches:create`](#csdx-cmbranchescreate)
* [`csdx cm:branches:delete [-uid <value>] [-k <value>]`](#csdx-cmbranchesdelete--uid-value--k-value)
* [`csdx cm:branches:diff [--base-branch <value>] [--compare-branch <value>] [-k <value>][--module <value>] [--format <value>] [--csv-path <value>]`](#csdx-cmbranchesdiff---base-branch-value---compare-branch-value--k-value--module-value---format-value---csv-path-value)
* [`csdx cm:branches:merge [-k <value>][--compare-branch <value>] [--no-revert] [--export-summary-path <value>] [--use-merge-summary <value>] [--comment <value>] [--base-branch <value>]`](#csdx-cmbranchesmerge--k-value--compare-branch-value---no-revert---export-summary-path-value---use-merge-summary-value---comment-value---base-branch-value)
* [`csdx cm:export-to-csv`](#csdx-cmexport-to-csv)
* [`csdx cm:stacks:migration [-k <value>] [-a <value>] [--file-path <value>] [--branch <value>] [--config-file <value>] [--config <value>] [--multiple]`](#csdx-cmstacksmigration--k-value--a-value---file-path-value---branch-value---config-file-value---config-value---multiple)
* [`csdx cm:stacks:clone [--source-branch <value>] [--target-branch <value>] [--source-management-token-alias <value>] [--destination-management-token-alias <value>] [-n <value>] [--type a|b] [--source-stack-api-key <value>] [--destination-stack-api-key <value>] [--import-webhook-status disable|current]`](#csdx-cmstacksclone---source-branch-value---target-branch-value---source-management-token-alias-value---destination-management-token-alias-value--n-value---type-ab---source-stack-api-key-value---destination-stack-api-key-value---import-webhook-status-disablecurrent)
* [`csdx cm:stacks:audit`](#csdx-cmstacksaudit)
* [`csdx cm:stacks:audit:fix`](#csdx-cmstacksauditfix)
* [`csdx cm:stacks:bulk-assets`](#csdx-cmstacksbulk-assets)
* [`csdx cm:stacks:bulk-entries`](#csdx-cmstacksbulk-entries)
* [`csdx cm:stacks:clone [--source-branch <value>] [--target-branch <value>] [--source-management-token-alias <value>] [--destination-management-token-alias <value>] [-n <value>] [--type a|b] [--source-stack-api-key <value>] [--destination-stack-api-key <value>] [--import-webhook-status disable|current]`](#csdx-cmstacksclone---source-branch-value---target-branch-value---source-management-token-alias-value---destination-management-token-alias-value--n-value---type-ab---source-stack-api-key-value---destination-stack-api-key-value---import-webhook-status-disablecurrent)
* [`csdx cm:stacks:export [--config <value>] [--stack-api-key <value>] [--data-dir <value>] [--alias <value>] [--module <value>] [--content-types <value>] [--branch <value>] [--secured-assets]`](#csdx-cmstacksexport---config-value---stack-api-key-value---data-dir-value---alias-value---module-value---content-types-value---branch-value---secured-assets)
* [`csdx cm:stacks:import [--config <value>] [--stack-api-key <value>] [--data-dir <value>] [--alias <value>] [--module <value>] [--backup-dir <value>] [--branch <value>] [--import-webhook-status disable|current]`](#csdx-cmstacksimport---config-value---stack-api-key-value---data-dir-value---alias-value---module-value---backup-dir-value---branch-value---import-webhook-status-disablecurrent)
* [`csdx cm:stacks:import-setup [-k <value>] [-d <value>] [-a <value>] [--modules <value,value>]`](#csdx-cmstacksimport-setup--k-value--d-value--a-value---modules-valuevalue)
* [`csdx cm:stacks:migration [-k <value>] [-a <value>] [--file-path <value>] [--branch <value>] [--config-file <value>] [--config <value>] [--multiple]`](#csdx-cmstacksmigration--k-value--a-value---file-path-value---branch-value---config-file-value---config-value---multiple)
* [`csdx cm:stacks:seed [--repo <value>] [--org <value>] [--stack-api-key <value>] [--stack-name <value>] [--yes <value>] [--alias <value>] [--locale <value>]`](#csdx-cmstacksseed---repo-value---org-value---stack-api-key-value---stack-name-value---yes-value---alias-value---locale-value)
* [`csdx config:get:base-branch`](#csdx-configgetbase-branch)
* [`csdx config:get:ea-header`](#csdx-configgetea-header)
* [`csdx config:get:early-access-header`](#csdx-configgetearly-access-header)
* [`csdx config:get:log`](#csdx-configgetlog)
* [`csdx config:get:proxy`](#csdx-configgetproxy)
* [`csdx config:get:rate-limit`](#csdx-configgetrate-limit)
* [`csdx config:get:region`](#csdx-configgetregion)
* [`csdx config:remove:base-branch`](#csdx-configremovebase-branch)
* [`csdx config:remove:ea-header`](#csdx-configremoveea-header)
* [`csdx config:remove:early-access-header`](#csdx-configremoveearly-access-header)
* [`csdx config:remove:proxy`](#csdx-configremoveproxy)
* [`csdx config:remove:rate-limit`](#csdx-configremoverate-limit)
* [`csdx config:set:base-branch`](#csdx-configsetbase-branch)
* [`csdx config:set:ea-header`](#csdx-configsetea-header)
* [`csdx config:set:early-access-header`](#csdx-configsetearly-access-header)
* [`csdx config:set:log`](#csdx-configsetlog)
* [`csdx config:set:proxy`](#csdx-configsetproxy)
* [`csdx config:set:rate-limit`](#csdx-configsetrate-limit)
* [`csdx config:set:region [REGION]`](#csdx-configsetregion-region)
* [`csdx help [COMMAND]`](#csdx-help-command)
* [`csdx launch`](#csdx-launch)
* [`csdx launch:deployments`](#csdx-launchdeployments)
* [`csdx launch:environments`](#csdx-launchenvironments)
* [`csdx launch:functions`](#csdx-launchfunctions)
* [`csdx launch:logs`](#csdx-launchlogs)
* [`csdx launch:open`](#csdx-launchopen)
* [`csdx login`](#csdx-login)
* [`csdx logout`](#csdx-logout)
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
* [`csdx tokens`](#csdx-tokens)
* [`csdx whoami`](#csdx-whoami)

## `csdx auth:login`

User sessions login

```
USAGE
  $ csdx auth:login [-u <value> | --oauth] [-p <value> | ]

FLAGS
  -p, --password=<value>  Password of your Contentstack app.
  -u, --username=<value>  Email address of your Contentstack account.
      --oauth             Enables single sign-on (SSO) in Contentstack CLI.

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
  -y, --yes  Force log out by skipping the confirmation.

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
  $ csdx auth:tokens [--columns <value>] [--sort <value>] [--filter <value>] [--csv] [--no-truncate]
    [--no-header] [--output csv|json|yaml]

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
  -a, --alias=<value>          Alias (name) you want to assign to the token
  -e, --environment=<value>    Environment name for delivery token
  -k, --stack-api-key=<value>  Stack API Key
  -y, --yes                    Use this flag to skip confirmation
      --delivery               Set this flag to save delivery token
      --management             Set this flag to save management token
      --token=<value>          [env: TOKEN] Add the token name

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
  -a, --alias=<value>  Alias (name) of the token to delete.
  -i, --ignore         Ignores if the token is not present.

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

## `csdx cm:bootstrap`

Bootstrap contentstack apps

```
USAGE
  $ csdx cm:bootstrap [--app-name <value>] [--project-dir <value>] [-k <value> | --org <value> | -n <value>] [-y
    <value>] [--run-dev-server] [-a <value>]

FLAGS
  -a, --alias=<value>          Alias of the management token
  -k, --stack-api-key=<value>  Provide stack API key to seed content
  -n, --stack-name=<value>     Name of the new stack that will be created.
  -y, --yes=<value>            [Optional] Skip stack confirmation
      --app-name=<value>       App name, kickstart-next, kickstart-next-ssr, kickstart-next-ssg, kickstart-next-graphql,
                               kickstart-next-middleware, kickstart-nuxt, kickstart-nuxt-ssr
      --org=<value>            Provide organization UID to create a new stack
      --project-dir=<value>    Directory to setup the project. If directory name has a space then provide the path as a
                               string or escap the space using back slash eg: "../../test space" or ../../test\ space
      --run-dev-server         Automatically start the development server after setup

DESCRIPTION
  Bootstrap contentstack apps

EXAMPLES
  $ csdx cm:bootstrap

  $ csdx cm:bootstrap --project-dir <path/to/setup/the/app>

  $ csdx cm:bootstrap --app-name "kickstart-next" --project-dir <path/to/setup/the/app>

  $ csdx cm:bootstrap --app-name "kickstart-next" --project-dir <path/to/setup/the/app> --stack-api-key "stack-api-key"

  $ csdx cm:bootstrap --app-name "kickstart-next" --project-dir <path/to/setup/the/app> --org "your-org-uid" --stack-name "stack-name"

  $ csdx cm:bootstrap --app-name "kickstart-next" --project-dir <path/to/setup/the/app> --run-dev-server
```

_See code: [@contentstack/cli-cm-bootstrap](https://github.com/contentstack/cli/blob/main/packages/contentstack-bootstrap/src/commands/cm/bootstrap.ts)_

## `csdx cm:branches`

List the branches

```
USAGE
  $ csdx cm:branches

FLAGS
  -k, --stack-api-key=<value>  Stack API key
      --verbose                Verbose, display information in detailed format.

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
      --source=<value>         Source branch from which a new branch is to be created.
      --uid=<value>            Branch UID (unique name) to be created.

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
      --uid=<value>            Branch UID to be deleted

DESCRIPTION
  Delete a branch

EXAMPLES
  $ csdx cm:branches:delete

  $ csdx cm:branches:delete --uid main -k bltxxxxxxxx

  $ csdx cm:branches:delete --uid main --stack-api-key bltxxxxxxxx

  $ csdx cm:branches:delete --uid main --stack-api-key bltxxxxxxxx --yes
```

_See code: [@contentstack/cli-cm-branches](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/branches/delete.ts)_

## `csdx cm:branches:diff [--base-branch <value>] [--compare-branch <value>] [-k <value>][--module <value>] [--format <value>] [--csv-path <value>]`

Differences between two branches

```
USAGE
  $ csdx cm:branches:diff [--base-branch <value>] [--compare-branch <value>] [-k <value>][--module <value>] [--format
    <value>] [--csv-path <value>]

FLAGS
  -k, --stack-api-key=<value>   [optional] Provide the stack API key to show the difference between branches.
      --base-branch=<value>     [optional] Base branch (Target branch).
      --compare-branch=<value>  [optional] Compare branch (Source branch).
      --csv-path=<value>        [optional] Custom path for CSV output file. If not provided, will use the current
                                working directory.
      --format=<option>         [default: compact-text] [default: compact-text] [optional] Type of flags to show the
                                difference between two branches. <options: compact-text, detailed-text>
                                <options: compact-text|detailed-text>
      --module=<option>         [optional] Module. <options: content-types, global-fields, all>
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

  $ csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main" --compare-branch "develop" --module "content-types" --format "compact-text"

  $ csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main" --compare-branch "develop" --module "content-types" --format "detailed-text" --csv-path "./reports/diff-report.csv"
```

_See code: [@contentstack/cli-cm-branches](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/branches/diff.ts)_

## `csdx cm:branches:merge [-k <value>][--compare-branch <value>] [--no-revert] [--export-summary-path <value>] [--use-merge-summary <value>] [--comment <value>] [--base-branch <value>]`

Merge changes from a branch

```
USAGE
  $ csdx cm:branches:merge [-k <value>][--compare-branch <value>] [--no-revert] [--export-summary-path <value>]
    [--use-merge-summary <value>] [--comment <value>] [--base-branch <value>]

FLAGS
  -k, --stack-api-key=<value>        [optional] Provide stack API key to show the difference between the branches.
      --base-branch=<value>          [optional] Base branch (Target branch).
      --comment=<value>              [optional] Pass a comment.
      --compare-branch=<value>       [optional] Compare branch (Source branch).
      --export-summary-path=<value>  [optional] Export summary file path.
      --no-revert                    [optional] If passed, will not create the new revert branch.
      --use-merge-summary=<value>    [optional] Path of merge summary file.

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

## `csdx cm:export-to-csv`

Export entries, taxonomies, terms or organization users to csv using this command

```
USAGE
  $ csdx cm:export-to-csv [--action entries|users|teams|taxonomies] [-a <value>] [--org <value>] [-n <value>] [-k
    <value>] [--org-name <value>] [--locale <value>] [--content-type <value>] [--branch <value>] [--team-uid <value>]
    [--taxonomy-uid <value>] [--include-fallback] [--fallback-locale <value>] [--delimiter <value>]

FLAGS
  -a, --alias=<value>            Alias of the management token.
  -k, --stack-api-key=<value>    API Key of the source stack.
  -n, --stack-name=<value>       Name of the stack that needs to be created as CSV filename.
      --action=<option>          Option to export data (entries, users, teams, taxonomies). <options:
                                 entries|users|teams|taxonomies>
                                 <options: entries|users|teams|taxonomies>
      --branch=<value>           Branch from which entries will be exported.
      --content-type=<value>     Content type of entries that will be exported.
      --delimiter=<value>        [default: ,] [optional] Provide a delimiter to separate individual data fields within
                                 the CSV file. For example: cm:export-to-csv --delimiter '|'
      --fallback-locale=<value>  [Optional] Specify a specific fallback locale for taxonomy export. This locale will be
                                 used when a taxonomy term doesn't exist in the primary locale. Takes priority over
                                 branch fallback hierarchy when both are specified.
      --include-fallback         [Optional] Include fallback locale data when exporting taxonomies. When enabled, if a
                                 taxonomy term doesn't exist in the specified locale, it will fallback to the hierarchy
                                 defined in the branch settings.
      --locale=<value>           Locale of entries that will be exported.
      --org=<value>              Provide organization UID to clone org users.
      --org-name=<value>         Name of the organization that needs to be created as CSV filename.
      --taxonomy-uid=<value>     Provide the taxonomy UID of the related terms you want to export.
      --team-uid=<value>         Provide the UID of a specific team in an organization.

DESCRIPTION
  Export entries, taxonomies, terms or organization users to csv using this command

ALIASES
  $ csdx cm:export-to-csv

EXAMPLES
  $ csdx cm:export-to-csv



  Exporting entries to CSV

  $ csdx cm:export-to-csv --action entries --locale <locale> --alias <management-token-alias> --content-type <content-type>



  Exporting entries to CSV with stack name and branch

  $ csdx cm:export-to-csv --action entries --locale <locale> --alias <management-token-alias> --content-type <content-type> --stack-name <stack-name> --branch <branch-name>



  Exporting organization users to CSV

  $ csdx cm:export-to-csv --action users --org <org-uid>



  Exporting organization teams to CSV

  $ csdx cm:export-to-csv --action teams --org <org-uid>



  Exporting teams with specific team UID

  $ csdx cm:export-to-csv --action teams --org <org-uid> --team-uid <team-uid>



  Exporting taxonomies to CSV

  $ csdx cm:export-to-csv --action taxonomies --alias <management-token-alias>



  Exporting specific taxonomy with locale

  $ csdx cm:export-to-csv --action taxonomies --alias <management-token-alias> --taxonomy-uid <taxonomy-uid> --locale <locale>



  Exporting taxonomies with fallback locale

  $ csdx cm:export-to-csv --action taxonomies --alias <management-token-alias> --locale <locale> --include-fallback --fallback-locale <fallback-locale>
```

_See code: [@contentstack/cli-cm-export-to-csv](https://github.com/contentstack/cli/blob/main/packages/contentstack-export-to-csv/src/commands/cm/export-to-csv.ts)_

## `csdx cm:stacks:migration [-k <value>] [-a <value>] [--file-path <value>] [--branch <value>] [--config-file <value>] [--config <value>] [--multiple]`

Contentstack migration script.

```
USAGE
  $ csdx cm:migration cm:stacks:migration [-k <value>] [-a <value>] [--file-path <value>] [--branch <value>]
    [--config-file <value>] [--config <value>] [--multiple]

FLAGS
  -a, --alias=<value>          Use this flag to add the management token alias. You must use either the --alias flag or
                               the --stack-api-key flag.
  -k, --stack-api-key=<value>  Use this flag to add the API key of your stack. You must use either the --stack-api-key
                               flag or the --alias flag.
      --branch=<value>         Use this flag to add the branch name where you want to perform the migration. (target
                               branch name)
      --config=<value>...      [optional] Inline configuration, <key1>:<value1>. Passing an external configuration makes
                               the script re-usable.
      --config-file=<value>    [optional] Path of the JSON configuration file.
      --file-path=<value>      Use this flag to provide the path of the file of the migration script.
      --multiple               This flag helps you to migrate multiple content files in a single instance. Mention the
                               folder path where your migration script files are stored.

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

  $ csdx cm:migration --alias <management-token-alias> --file-path <migration/script/file/path>
```

## `csdx cm:stacks:clone [--source-branch <value>] [--target-branch <value>] [--source-management-token-alias <value>] [--destination-management-token-alias <value>] [-n <value>] [--type a|b] [--source-stack-api-key <value>] [--destination-stack-api-key <value>] [--import-webhook-status disable|current]`

Clone data (structure/content or both) of a stack into another stack

```
USAGE
  $ csdx cm:stack-clone cm:stacks:clone [--source-branch <value>] [--target-branch <value>]
    [--source-management-token-alias <value>] [--destination-management-token-alias <value>] [-n <value>] [--type a|b]
    [--source-stack-api-key <value>] [--destination-stack-api-key <value>] [--import-webhook-status disable|current]

FLAGS
  -c, --config=<value>                              Path for the external configuration
  -n, --stack-name=<value>                          Provide a name for the new stack to store the cloned content.
  -y, --yes                                         Force override all Marketplace prompts.
      --destination-management-token-alias=<value>  Destination management token alias.
      --destination-stack-api-key=<value>           Destination stack API key
      --import-webhook-status=<option>              [default: disable] [default: disable] (optional) The status of the
                                                    import webhook. <options: disable|current>
                                                    <options: disable|current>
      --skip-audit                                  (optional) Skips the audit fix that occurs during an import
                                                    operation.
      --source-branch=<value>                       Branch of the source stack.
      --source-branch-alias=<value>                 Alias of Branch of the source stack.
      --source-management-token-alias=<value>       Source management token alias.
      --source-stack-api-key=<value>                Source stack API key
      --target-branch=<value>                       Branch of the target stack.
      --target-branch-alias=<value>                 Alias of Branch of the target stack.
      --type=<option>                               Type of data to clone. You can select option a or b.
                                                    a) Structure (all modules except entries & assets).
                                                    b) Structure with content (all modules including entries & assets).

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
  $ csdx cm:stacks:audit [-c <value>] [-d <value>] [--show-console-output] [--report-path <value>] [--modules
    content-types|global-fields|entries|extensions|workflows|custom-roles|assets|field-rules|composable-studio...]
    [--columns <value>] [--sort <value>] [--filter <value>] [--csv] [--no-truncate] [--no-header] [--output
    csv|json|yaml]

FLAGS
  --modules=<option>...  Provide the list of modules to be audited
                         <options: content-types|global-fields|entries|extensions|workflows|custom-roles|assets|field-ru
                         les|composable-studio>
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
  $ csdx cm:stacks:audit:fix [-c <value>] [-d <value>] [--show-console-output] [--report-path <value>] [--modules
    content-types|global-fields|entries|extensions|workflows|custom-roles|assets|field-rules|composable-studio...]
    [--copy-path <value> --copy-dir] [--fix-only
    reference|global_field|json:rte|json:extension|blocks|group|content_types...] [--columns <value>] [--sort <value>]
    [--filter <value>] [--csv] [--no-truncate] [--no-header] [--output csv|json|yaml]

FLAGS
  --copy-dir              Create backup from the original data.
  --copy-path=<value>     Provide the path to backup the copied data
  --fix-only=<option>...  Provide the list of fix options
                          <options: reference|global_field|json:rte|json:extension|blocks|group|content_types>
  --modules=<option>...   Provide the list of modules to be audited
                          <options: content-types|global-fields|entries|extensions|workflows|custom-roles|assets|field-r
                          ules|composable-studio>
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

EXAMPLES
  $ csdx cm:stacks:audit:fix --copy-dir

  $ csdx cm:stacks:audit:fix --report-path=<path> --copy-dir

  $ csdx cm:stacks:audit:fix --report-path=<path> --copy-dir --csv

  $ csdx cm:stacks:audit:fix --fix-only=reference,global_field --copy-dir

  $ csdx cm:stacks:audit:fix --report-path=<path> --filter="name=<filter-value>"

  $ csdx cm:stacks:audit:fix --report-path=<path> --modules=content-types --filter="name="<filter-value>" --copy-dir --copy-path=<path>
```

_See code: [@contentstack/cli-audit](https://github.com/contentstack/audit/blob/main/packages/contentstack-audit/src/commands/cm/stacks/audit/fix.ts)_

## `csdx cm:stacks:bulk-assets`

Bulk operations for assets (publish/unpublish/cross-publish)

```
USAGE
  $ csdx cm:stacks:bulk-assets [-a <value>] [-k <value>] [--operation publish|unpublish] [--environments <value>...]
    [--locales <value>...] [--source-env <value>] [--source-alias <value>] [--publish-mode bulk|single] [--branch
    <value>] [-c <value>] [-y] [--retry-failed <value>] [--revert <value>] [--bulk-operation-file <value>] [--folder-uid
    <value>]

FLAGS
  -a, --alias=<value>                Uses the name of a saved Management Token to authenticate the command. The command
                                     can only access the branches allowed for that token. This option can be used as an
                                     alternative to` --stack-api-key.`
  -c, --config=<value>               (optional) Specifies the path to a JSON configuration file that defines the options
                                     for the command. Use this file instead of passing multiple CLI flags for a single
                                     run.
  -k, --stack-api-key=<value>        API key of the source stack. You must use either the --stack-api-key flag or the
                                     --alias flag.
  -y, --yes                          Skips interactive confirmation prompts and runs the command immediately using the
                                     provided options. Useful for automation and scripts.
      --branch=<value>               [default: main] The name of the branch where you want to perform the bulk publish
                                     operation. If you don't mention the branch name, then by default the content from
                                     main branch will be published.
      --bulk-operation-file=<value>  [default: bulk-operation] (optional) Folder path to store operation logs. Creates
                                     separate files for success and failed operations. Default: bulk-operation
      --environments=<value>...      Specifies one or more environments where the entries or assets should be published.
                                     Separate multiple environments with spaces.
      --folder-uid=<value>           (optional) The UID of the Assets' folder from which the assets need to be
                                     published. The default value is cs_root.
      --locales=<value>...           Specifies one or more locale codes for which the entries or assets should be
                                     published. Separate multiple locales with spaces.
      --operation=<option>           Specifies whether to `publish` or `unpublish` content.
                                     <options: publish|unpublish>
      --publish-mode=<option>        [default: bulk] Publish mode: bulk (uses Bulk Publish API) or single (individual
                                     API calls)
                                     <options: bulk|single>
      --retry-failed=<value>         (optional) Use this option to retry publishing the failed entries/assets from the
                                     logfile. Specify the name of the logfile that lists failed publish calls. If this
                                     option is used, it will override all other flags.
      --revert=<value>               (optional) Revert publish operations from a log folder. Specify the folder path
                                     containing success logs. Works similar to retry-failed.
      --source-alias=<value>         Alias name for source environment delivery token (required for cross-publish). Add
                                     delivery token using: csdx auth:tokens:add
      --source-env=<value>           Source environment for cross-publish

DESCRIPTION
  Bulk operations for assets (publish/unpublish/cross-publish)

EXAMPLES
  $ csdx cm:stacks:bulk-assets --operation publish --environments dev,staging --locales en-us -k blt123

  $ csdx cm:stacks:bulk-assets --operation unpublish --environments prod --locales en-us -a myAlias

  $ csdx cm:stacks:bulk-assets --operation publish --folder-uid cs_root --environments prod --locales en-us -k blt123

  $ csdx cm:stacks:bulk-assets --operation publish --environments prod --locales en-us --publish-mode bulk -k blt123

  $ csdx cm:stacks:bulk-assets --operation publish --source-env production --source-alias prod-delivery --environments staging,dev --locales en-us -a myAlias

  $ csdx cm:stacks:bulk-assets --retry-failed ./bulk-operation -a myAlias

  $ csdx cm:stacks:bulk-assets --revert ./bulk-operation -a myAlias
```

_See code: [@contentstack/cli-bulk-operations](https://github.com/contentstack/cli-bulk-operations/blob/v1.0.0-beta/src/commands/cm/stacks/bulk-assets.ts)_

## `csdx cm:stacks:bulk-entries`

Bulk operations for entries (publish/unpublish/cross-publish)

```
USAGE
  $ csdx cm:stacks:bulk-entries [-a <value>] [-k <value>] [--operation publish|unpublish] [--environments <value>...]
    [--locales <value>...] [--source-env <value>] [--source-alias <value>] [--publish-mode bulk|single] [--branch
    <value>] [-c <value>] [-y] [--retry-failed <value>] [--revert <value>] [--bulk-operation-file <value>]
    [--content-types <value>...] [--filter draft|modified|non-localized|unpublished] [--include-variants] [--api-version
    <value>]

FLAGS
  -a, --alias=<value>                Uses the name of a saved Management Token to authenticate the command. The command
                                     can only access the branches allowed for that token. This option can be used as an
                                     alternative to` --stack-api-key.`
  -c, --config=<value>               (optional) Specifies the path to a JSON configuration file that defines the options
                                     for the command. Use this file instead of passing multiple CLI flags for a single
                                     run.
  -k, --stack-api-key=<value>        API key of the source stack. You must use either the --stack-api-key flag or the
                                     --alias flag.
  -y, --yes                          Skips interactive confirmation prompts and runs the command immediately using the
                                     provided options. Useful for automation and scripts.
      --api-version=<value>          [default: 3.2] Specifies the Content Management API version used for publishing.
                                     Use version `3.2` when publishing entries with nested references, otherwise, use
                                     the default version 3.2
      --branch=<value>               [default: main] The name of the branch where you want to perform the bulk publish
                                     operation. If you don't mention the branch name, then by default the content from
                                     main branch will be published.
      --bulk-operation-file=<value>  [default: bulk-operation] (optional) Folder path to store operation logs. Creates
                                     separate files for success and failed operations. Default: bulk-operation
      --content-types=<value>...     Content type UIDs to perform operation on. If not provided, operates on all content
                                     types.
      --environments=<value>...      Specifies one or more environments where the entries or assets should be published.
                                     Separate multiple environments with spaces.
      --filter=<option>              Filter entries by status
                                     <options: draft|modified|non-localized|unpublished>
      --include-variants             Includes entry variants (alternate versions of a base entry) in the bulk operation.
                                     By default, only base entries are processed.
      --locales=<value>...           Specifies one or more locale codes for which the entries or assets should be
                                     published. Separate multiple locales with spaces.
      --operation=<option>           Specifies whether to `publish` or `unpublish` content.
                                     <options: publish|unpublish>
      --publish-mode=<option>        [default: bulk] Publish mode: bulk (uses Bulk Publish API) or single (individual
                                     API calls)
                                     <options: bulk|single>
      --retry-failed=<value>         (optional) Use this option to retry publishing the failed entries/assets from the
                                     logfile. Specify the name of the logfile that lists failed publish calls. If this
                                     option is used, it will override all other flags.
      --revert=<value>               (optional) Revert publish operations from a log folder. Specify the folder path
                                     containing success logs. Works similar to retry-failed.
      --source-alias=<value>         Alias name for source environment delivery token (required for cross-publish). Add
                                     delivery token using: csdx auth:tokens:add
      --source-env=<value>           Source environment for cross-publish

DESCRIPTION
  Bulk operations for entries (publish/unpublish/cross-publish)

EXAMPLES
  $ csdx cm:stacks:bulk-entries --operation publish --environments dev --locales en-us -k blt123

  $ csdx cm:stacks:bulk-entries --operation publish --content-types blog,article --environments dev --locales en-us -k blt123

  $ csdx cm:stacks:bulk-entries --operation unpublish --content-types blog --environments prod --locales en-us -a myAlias

  $ csdx cm:stacks:bulk-entries --operation publish --content-types blog --source-env production --source-alias prod-delivery --environments staging --locales en-us -a myAlias

  $ csdx cm:stacks:bulk-entries --operation publish --content-types blog --environments prod --locales en-us --publish-mode bulk -k blt123

  $ csdx cm:stacks:bulk-entries --operation publish --content-types blog --environments prod --locales en-us --filter modified -k blt123

  $ csdx cm:stacks:bulk-entries --operation publish --content-types blog --environments prod --locales en-us --include-variants -k blt123

  $ csdx cm:stacks:bulk-entries --retry-failed ./bulk-operation

  $ csdx cm:stacks:bulk-entries --revert ./bulk-operation
```

_See code: [@contentstack/cli-bulk-operations](https://github.com/contentstack/cli-bulk-operations/blob/v1.0.0-beta/src/commands/cm/stacks/bulk-entries.ts)_

## `csdx cm:stacks:clone [--source-branch <value>] [--target-branch <value>] [--source-management-token-alias <value>] [--destination-management-token-alias <value>] [-n <value>] [--type a|b] [--source-stack-api-key <value>] [--destination-stack-api-key <value>] [--import-webhook-status disable|current]`

Clone data (structure/content or both) of a stack into another stack

```
USAGE
  $ csdx cm:stacks:clone [--source-branch <value>] [--target-branch <value>] [--source-management-token-alias
    <value>] [--destination-management-token-alias <value>] [-n <value>] [--type a|b] [--source-stack-api-key <value>]
    [--destination-stack-api-key <value>] [--import-webhook-status disable|current]

FLAGS
  -c, --config=<value>                              Path for the external configuration
  -n, --stack-name=<value>                          Provide a name for the new stack to store the cloned content.
  -y, --yes                                         Force override all Marketplace prompts.
      --destination-management-token-alias=<value>  Destination management token alias.
      --destination-stack-api-key=<value>           Destination stack API key
      --import-webhook-status=<option>              [default: disable] [default: disable] (optional) The status of the
                                                    import webhook. <options: disable|current>
                                                    <options: disable|current>
      --skip-audit                                  (optional) Skips the audit fix that occurs during an import
                                                    operation.
      --source-branch=<value>                       Branch of the source stack.
      --source-branch-alias=<value>                 Alias of Branch of the source stack.
      --source-management-token-alias=<value>       Source management token alias.
      --source-stack-api-key=<value>                Source stack API key
      --target-branch=<value>                       Branch of the target stack.
      --target-branch-alias=<value>                 Alias of Branch of the target stack.
      --type=<option>                               Type of data to clone. You can select option a or b.
                                                    a) Structure (all modules except entries & assets).
                                                    b) Structure with content (all modules including entries & assets).

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

_See code: [@contentstack/cli-cm-clone](https://github.com/contentstack/cli/blob/main/packages/contentstack-clone/src/commands/cm/stacks/clone.ts)_

## `csdx cm:stacks:export [--config <value>] [--stack-api-key <value>] [--data-dir <value>] [--alias <value>] [--module <value>] [--content-types <value>] [--branch <value>] [--secured-assets]`

Export content from a stack

```
USAGE
  $ csdx cm:stacks:export [--config <value>] [--stack-api-key <value>] [--data-dir <value>] [--alias <value>]
    [--module <value>] [--content-types <value>] [--branch <value>] [--secured-assets]

FLAGS
  -a, --alias=<value>             The management token alias of the source stack from which you will export content.
  -c, --config=<value>            [optional] Path of the config
  -d, --data-dir=<value>          The path or the location in your file system to store the exported content. For e.g.,
                                  ./content
  -k, --stack-api-key=<value>     API Key of the source stack
  -y, --yes                       [optional] Force override all Marketplace prompts.
      --branch=<value>            [optional] The name of the branch where you want to export your content. If you don't
                                  mention the branch name, then by default the content will be exported from all the
                                  branches of your stack.
      --branch-alias=<value>      (Optional) The alias of the branch from which you want to export content.
      --content-types=<value>...  [optional]  The UID of the content type(s) whose content you want to export. In case
                                  of multiple content types, specify the IDs separated by spaces.
      --module=<value>            [optional] Specific module name. If not specified, the export command will export all
                                  the modules to the stack. The available modules are assets, content-types, entries,
                                  environments, extensions, marketplace-apps, global-fields, labels, locales, webhooks,
                                  workflows, custom-roles, taxonomies, and studio.
      --secured-assets            [optional] Use this flag for assets that are secured.

DESCRIPTION
  Export content from a stack

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

## `csdx cm:stacks:import [--config <value>] [--stack-api-key <value>] [--data-dir <value>] [--alias <value>] [--module <value>] [--backup-dir <value>] [--branch <value>] [--import-webhook-status disable|current]`

Import content from a stack

```
USAGE
  $ csdx cm:stacks:import [--config <value>] [--stack-api-key <value>] [--data-dir <value>] [--alias <value>]
    [--module <value>] [--backup-dir <value>] [--branch <value>] [--import-webhook-status disable|current]

FLAGS
  -a, --alias=<value>
      The management token of the destination stack where you will import the content.

  -c, --config=<value>
      [optional] The path of the configuration JSON file containing all the options for a single run.

  -d, --data-dir=<value>
      The path or the location in your file system where the content, you intend to import, is stored. For example, -d
      "C:\Users\Name\Desktop\cli\content". If the export folder has branches involved, then the path should point till the
      particular branch. For example, “-d "C:\Users\Name\Desktop\cli\content\branch_name"

  -k, --stack-api-key=<value>
      API Key of the target stack

  -y, --yes
      [optional] Force override all Marketplace prompts.

  --backup-dir=<value>
      [optional] Backup directory name when using specific module.

  --branch=<value>
      The name of the branch where you want to import your content. If you don't mention the branch name, then by default
      the content will be imported to the main branch.

  --branch-alias=<value>
      Specify the branch alias where you want to import your content. If not specified, the content is imported into the
      main branch by default.

  --exclude-global-modules
      Excludes the branch-independent module from the import operation.

  --import-webhook-status=<option>
      [default: disable] [default: disable] (optional) This webhook state keeps the same state of webhooks as the source
      stack. <options: disable|current>
      <options: disable|current>

  --module=<value>
      [optional] Specify the module to import into the target stack. If not specified, the import command will import all
      the modules into the stack. The available modules are assets, content-types, entries, environments, extensions,
      marketplace-apps, global-fields, labels, locales, webhooks, workflows, custom-roles, personalize projects,
      taxonomies, and composable-studio.

  --personalize-project-name=<value>
      (optional) Provide a unique name for the Personalize project.

  --replace-existing
      Replaces the existing module in the target stack.

  --skip-assets-publish
      Skips asset publishing during the import process.

  --skip-audit
      Skips the audit fix that occurs during an import operation.

  --skip-entries-publish
      Skips entry publishing during the import process

  --skip-existing
      Skips the module exists warning messages.

DESCRIPTION
  Import content from a stack

EXAMPLES
  $ csdx cm:stacks:import --stack-api-key <stack_api_key> --data-dir <path/of/export/destination/dir>

  $ csdx cm:stacks:import --config <path/of/config/dir>

  $ csdx cm:stacks:import --module <single module name>

  $ csdx cm:stacks:import --module <single module name> --backup-dir <backup dir>

  $ csdx cm:stacks:import --alias <management_token_alias>

  $ csdx cm:stacks:import --alias <management_token_alias> --data-dir <path/of/export/destination/dir>

  $ csdx cm:stacks:import --alias <management_token_alias> --config <path/of/config/file>

  $ csdx cm:stacks:import --branch <branch name>  --yes --skip-audit
```

_See code: [@contentstack/cli-cm-import](https://github.com/contentstack/cli/blob/main/packages/contentstack-import/src/commands/cm/stacks/import.ts)_

## `csdx cm:stacks:import-setup [-k <value>] [-d <value>] [-a <value>] [--modules <value,value>]`

Helps to generate mappers and backup folder for importing (overwriting) specific modules

```
USAGE
  $ csdx cm:stacks:import-setup [-k <value>] [-d <value>] [-a <value>] [--modules <value,value>]

FLAGS
  -a, --alias=<value>          The management token of the destination stack where you will import the content.
  -d, --data-dir=<value>       The path or the location in your file system where the content, you intend to import, is
                               stored. For example, -d "C:\Users\Name\Desktop\cli\content". If the export folder has
                               branches involved, then the path should point till the particular branch. For example,
                               “-d "C:\Users\Name\Desktop\cli\content\branch_name"
  -k, --stack-api-key=<value>  API key of the target stack
      --branch=<value>         The name of the branch where you want to import your content. If you don't mention the
                               branch name, then by default the content will be imported to the main branch.
      --branch-alias=<value>   Specify the branch alias where you want to import your content. If not specified, the
                               content is imported into the main branch by default.
      --module=<option>...     [optional] Specify the modules/module to import into the target stack. currently options
                               are global-fields, content-types, entries
                               <options: global-fields|content-types|entries>

DESCRIPTION
  Helps to generate mappers and backup folder for importing (overwriting) specific modules

EXAMPLES
  $ csdx cm:stacks:import-setup --stack-api-key <target_stack_api_key> --data-dir <path/of/export/destination/dir> --modules <module_name, module_name> --branch <branch_name>
```

_See code: [@contentstack/cli-cm-import-setup](https://github.com/contentstack/cli/blob/main/packages/contentstack-import-setup/src/commands/cm/stacks/import-setup.ts)_

## `csdx cm:stacks:migration [-k <value>] [-a <value>] [--file-path <value>] [--branch <value>] [--config-file <value>] [--config <value>] [--multiple]`

Contentstack migration script.

```
USAGE
  $ csdx cm:stacks:migration [-k <value>] [-a <value>] [--file-path <value>] [--branch <value>] [--config-file <value>]
    [--config <value>] [--multiple]

FLAGS
  -a, --alias=<value>          Use this flag to add the management token alias. You must use either the --alias flag or
                               the --stack-api-key flag.
  -k, --stack-api-key=<value>  Use this flag to add the API key of your stack. You must use either the --stack-api-key
                               flag or the --alias flag.
      --branch=<value>         Use this flag to add the branch name where you want to perform the migration. (target
                               branch name)
      --config=<value>...      [optional] Inline configuration, <key1>:<value1>. Passing an external configuration makes
                               the script re-usable.
      --config-file=<value>    [optional] Path of the JSON configuration file.
      --file-path=<value>      Use this flag to provide the path of the file of the migration script.
      --multiple               This flag helps you to migrate multiple content files in a single instance. Mention the
                               folder path where your migration script files are stored.

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

  $ csdx cm:migration --alias <management-token-alias> --file-path <migration/script/file/path>
```

_See code: [@contentstack/cli-migration](https://github.com/contentstack/cli/blob/main/packages/contentstack-migration/src/commands/cm/stacks/migration.ts)_

## `csdx cm:stacks:seed [--repo <value>] [--org <value>] [--stack-api-key <value>] [--stack-name <value>] [--yes <value>] [--alias <value>] [--locale <value>]`

Create a stack from existing content types, entries, assets, etc

```
USAGE
  $ csdx cm:stacks:seed [--repo <value>] [--org <value>] [--stack-api-key <value>] [--stack-name <value>] [--yes
    <value>] [--alias <value>] [--locale <value>]

FLAGS
  -a, --alias=<value>          Alias of the management token
  -k, --stack-api-key=<value>  Provide stack API key to seed content to
  -n, --stack-name=<value>     Name of a new stack that needs to be created.
  -y, --yes=<value>            [Optional] Skip the stack confirmation.
      --org=<value>            Provide Organization UID to create a new stack
      --repo=<value>           GitHub organization name or GitHub user name/repository name.

DESCRIPTION
  Create a stack from existing content types, entries, assets, etc

EXAMPLES
  $ csdx cm:stacks:seed

  $ csdx cm:stacks:seed --repo "account"

  $ csdx cm:stacks:seed --repo "account/repository"

  $ csdx cm:stacks:seed --repo "account/repository" --stack-api-key "stack-api-key" //seed content into specific stack

  $ csdx cm:stacks:seed --repo "account/repository" --org "your-org-uid" --stack-name "stack-name" //create a new stack in given org uid
```

_See code: [@contentstack/cli-cm-seed](https://github.com/contentstack/cli/blob/main/packages/contentstack-seed/src/commands/cm/stacks/seed.ts)_

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

## `csdx config:get:ea-header`

Display Early Access headers

```
USAGE
  $ csdx config:get:ea-header

DESCRIPTION
  Display Early Access headers

ALIASES
  $ csdx config:get:ea-header

EXAMPLES
  $ csdx config:get:ea-header
```

## `csdx config:get:early-access-header`

Display Early Access headers

```
USAGE
  $ csdx config:get:early-access-header

DESCRIPTION
  Display Early Access headers

ALIASES
  $ csdx config:get:ea-header

EXAMPLES
  $ csdx config:get:early-access-header
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/get/early-access-header.ts)_

## `csdx config:get:log`

Get logging configuration for CLI

```
USAGE
  $ csdx config:get:log

DESCRIPTION
  Get logging configuration for CLI

EXAMPLES
  $ csdx config:get:log
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/get/log.ts)_

## `csdx config:get:proxy`

Get proxy configuration for CLI

```
USAGE
  $ csdx config:get:proxy

DESCRIPTION
  Get proxy configuration for CLI

EXAMPLES
  $ csdx config:get:proxy
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/get/proxy.ts)_

## `csdx config:get:rate-limit`

Get rate-limit of organizations

```
USAGE
  $ csdx config:get:rate-limit

DESCRIPTION
  Get rate-limit of organizations

EXAMPLES
  $ csdx config:get:rate-limit
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/get/rate-limit.ts)_

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
  -k, --stack-api-key=<value>  Stack API key.
  -y, --yes                    Force remove.

DESCRIPTION
  Remove branch config for CLI

EXAMPLES
  $ csdx config:remove:base-branch

  $ csdx config:remove:base-branch --stack-api-key <value>
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/remove/base-branch.ts)_

## `csdx config:remove:ea-header`

Remove Early Access header

```
USAGE
  $ csdx config:remove:ea-header [--header-alias <value>] [-y]

FLAGS
  -y, --yes                   (optional) Force the removal of Early Access header configuration by skipping the
                              confirmation.
      --header-alias=<value>  (optional) Provide the Early Access header alias name.

DESCRIPTION
  Remove Early Access header

ALIASES
  $ csdx config:remove:ea-header

EXAMPLES
  $ csdx config:remove:ea-header

  $ csdx config:remove:ea-header --header-alias <value>
```

## `csdx config:remove:early-access-header`

Remove Early Access header

```
USAGE
  $ csdx config:remove:early-access-header [--header-alias <value>] [-y]

FLAGS
  -y, --yes                   (optional) Force the removal of Early Access header configuration by skipping the
                              confirmation.
      --header-alias=<value>  (optional) Provide the Early Access header alias name.

DESCRIPTION
  Remove Early Access header

ALIASES
  $ csdx config:remove:ea-header

EXAMPLES
  $ csdx config:remove:early-access-header

  $ csdx config:remove:early-access-header --header-alias <value>
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/remove/early-access-header.ts)_

## `csdx config:remove:proxy`

Remove proxy configuration from global config

```
USAGE
  $ csdx config:remove:proxy

DESCRIPTION
  Remove proxy configuration from global config

EXAMPLES
  $ csdx config:remove:proxy
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/remove/proxy.ts)_

## `csdx config:remove:rate-limit`

Remove rate-limit of the organization

```
USAGE
  $ csdx config:remove:rate-limit [--org <value>]

FLAGS
  --org=<value>  Provide the organization UID

DESCRIPTION
  Remove rate-limit of the organization

EXAMPLES
  $ csdx config:remove:rate-limit --org <<org_uid>>
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/remove/rate-limit.ts)_

## `csdx config:set:base-branch`

Set branch for CLI

```
USAGE
  $ csdx config:set:base-branch [-k <value>] [--base-branch <value>]

FLAGS
  -k, --stack-api-key=<value>  Stack API key
      --base-branch=<value>    Base branch (Target branch).

DESCRIPTION
  Set branch for CLI

EXAMPLES
  $ csdx config:set:base-branch

  $ csdx config:set:base-branch --stack-api-key <value> --base-branch <value>
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/set/base-branch.ts)_

## `csdx config:set:ea-header`

Set Early Access header

```
USAGE
  $ csdx config:set:ea-header [--header-alias <value>] [--header <value>]

FLAGS
  --header=<value>        (optional) Provide the Early Access header alias name.
  --header-alias=<value>  (optional) Provide the Early Access header value.

DESCRIPTION
  Set Early Access header

ALIASES
  $ csdx config:set:ea-header

EXAMPLES
  $ csdx config:set:ea-header

  $ csdx config:set:ea-header --header <value> --header-alias <value>
```

## `csdx config:set:early-access-header`

Set Early Access header

```
USAGE
  $ csdx config:set:early-access-header [--header-alias <value>] [--header <value>]

FLAGS
  --header=<value>        (optional) Provide the Early Access header alias name.
  --header-alias=<value>  (optional) Provide the Early Access header value.

DESCRIPTION
  Set Early Access header

ALIASES
  $ csdx config:set:ea-header

EXAMPLES
  $ csdx config:set:early-access-header

  $ csdx config:set:early-access-header --header <value> --header-alias <value>
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/set/early-access-header.ts)_

## `csdx config:set:log`

Set logging configuration for CLI

```
USAGE
  $ csdx config:set:log [--level debug|info|warn|error] [--path <value>] [--show-console-logs]

FLAGS
  --level=<option>          Set the log level for the CLI. Defaults to "info" if not specified.
                            <options: debug|info|warn|error>
  --path=<value>            Specify the directory path where logs should be saved. Supports both relative and absolute
                            paths. Defaults to ~/.contentstack/logs if not specified.
  --[no-]show-console-logs  Enable console logging.

DESCRIPTION
  Set logging configuration for CLI

EXAMPLES
  $ csdx config:set:log

  $ csdx config:set:log --level debug

  $ csdx config:set:log --path ./logs

  $ csdx config:set:log --level debug --path ./logs --show-console-logs

  $ csdx config:set:log --no-show-console-logs

  $ csdx config:set:log --level warn --show-console-logs

  $ csdx config:set:log --path ~/custom/logs

  $ csdx config:set:log --path /var/log/contentstack
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/set/log.ts)_

## `csdx config:set:proxy`

Set proxy configuration for CLI

```
USAGE
  $ csdx config:set:proxy --host <value> --port <value> --protocol http|https [--username <value>]

FLAGS
  --host=<value>       (required) Proxy host address
  --port=<value>       (required) Proxy port number
  --protocol=<option>  (required) [default: http] Proxy protocol (http or https)
                       <options: http|https>
  --username=<value>   Proxy username (optional)

DESCRIPTION
  Set proxy configuration for CLI

EXAMPLES
  $ csdx config:set:proxy --host 127.0.0.1 --port 3128

  $ csdx config:set:proxy --host proxy.example.com --port 8080 --protocol https

  $ csdx config:set:proxy --host proxy.example.com --port 8080 --username user
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/set/proxy.ts)_

## `csdx config:set:rate-limit`

Set rate-limit for CLI

```
USAGE
  $ csdx config:set:rate-limit [--org <value>] [--utilize <value>] [--limit-name <value>...] [--default]

FLAGS
  --default                Reset to default rate limit
  --limit-name=<value>...  [Optional] Provide the limit names separated by commas ['limit', 'getLimit', 'bulkLimit']
  --org=<value>            Provide the organization UID
  --utilize=<value>        [default: 50] Provide the utilization percentages for rate limit, separated by commas

DESCRIPTION
  Set rate-limit for CLI

EXAMPLES
  $ csdx config:set:rate-limit --org <<org_uid>>

  $ csdx config:set:rate-limit --org <<org_uid>> --utilize 70,80 --limit-name getLimit,limit

  $ csdx config:set:rate-limit --org <<org_uid>> --default
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/set/rate-limit.ts)_

## `csdx config:set:region [REGION]`

Set region for CLI

```
USAGE
  $ csdx config:set:region [REGION] [--cda <value> --cma <value> --ui-host <value> -n <value>] [--developer-hub
    <value>] [--personalize <value>] [--launch <value>] [--studio <value>]

ARGUMENTS
  [REGION]  Name for the region

FLAGS
  -n, --name=<value>           Name for the region, if this flag is added then cda, cma and ui-host flags are required
      --cda=<value>            Custom host to set for content delivery API, if this flag is added then cma, ui-host and
                               name flags are required
      --cma=<value>            Custom host to set for content management API, , if this flag is added then cda, ui-host
                               and name flags are required
      --developer-hub=<value>  Custom host to set for Developer hub API
      --launch=<value>         Custom host to set for Launch API
      --personalize=<value>    Custom host to set for Personalize API
      --studio=<value>         Custom host to set for Studio API
      --ui-host=<value>        Custom UI host to set for CLI, if this flag is added then cda, cma and name flags are
                               required

DESCRIPTION
  Set region for CLI

EXAMPLES
  $ csdx config:set:region

  $ csdx config:set:region AWS-NA

  $ csdx config:set:region AWS-EU

  $ csdx config:set:region AWS-AU

  $ csdx config:set:region AZURE-NA

  $ csdx config:set:region AZURE-EU

  $ csdx config:set:region GCP-NA

  $ csdx config:set:region GCP-EU

  $ csdx config:set:region --cma <custom_cma_host_url> --cda <custom_cda_host_url> --ui-host <custom_ui_host_url> --name "India"

  $ csdx config:set:region --cma <custom_cma_host_url> --cda <custom_cda_host_url> --ui-host <custom_ui_host_url> --name "India" --developer-hub <custom_developer_hub_url>

  $ csdx config:set:region --cma <custom_cma_host_url> --cda <custom_cda_host_url> --ui-host <custom_ui_host_url> --name "India" --personalize <custom_personalize_url>

  $ csdx config:set:region --cma <custom_cma_host_url> --cda <custom_cda_host_url> --ui-host <custom_ui_host_url> --name "India" --launch <custom_launch_url>

  $ csdx config:set:region --cma <custom_cma_host_url> --cda <custom_cda_host_url> --ui-host <custom_ui_host_url> --name "India" --studio <custom_studio_url>

  $ csdx config:set:region --cda <custom_cda_host_url> --cma <custom_cma_host_url> --ui-host <custom_ui_host_url> --name "India" --developer-hub <custom_developer_hub_url> --launch <custom_launch_url> --personalize <custom_personalize_url> --studio <custom_studio_url>
```

_See code: [@contentstack/cli-config](https://github.com/contentstack/cli/blob/main/packages/contentstack-config/src/commands/config/set/region.ts)_

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.37/src/commands/help.ts)_

## `csdx launch`

Launch related operations

```
USAGE
  $ csdx launch [-d <value>] [-c <value>] [--type GitHub|FileUpload] [--framework Gatsby|NextJs|CRA (Create
    React App)|CSR (Client-Side Rendered)|Angular|Nuxt|VueJs|Remix|Other] [--org <value>] [-n <value>] [-e <value>]
    [--branch <value>] [--build-command <value>] [--out-dir <value>] [--server-command <value>] [--variable-type Import
    variables from a stack|Manually add custom variables to the list|Import variables from the .env.local file|Skip
    adding environment variables...] [-a <value>] [--env-variables <value>] [--redeploy-latest] [--redeploy-last-upload]

FLAGS
  -a, --alias=<value>              [optional] Alias (name) for the delivery token.
  -c, --config=<value>             Path to the local '.cs-launch.json' file
  -d, --data-dir=<value>           Current working directory
  -e, --environment=<value>        [optional] Environment name for the Launch project.
  -n, --name=<value>               [optional] Name of the project.
      --branch=<value>             [optional] GitHub branch name.
      --build-command=<value>      [optional] Build Command.
      --env-variables=<value>      [optional] Provide the environment variables in the key:value format, separated by
                                   comma. For example: APP_ENV:prod, TEST_ENV:testVal.
      --framework=<option>         [optional] Type of framework. <options: Gatsby|NextJS|Other>
                                   <options: Gatsby|NextJs|CRA (Create React App)|CSR (Client-Side
                                   Rendered)|Angular|Nuxt|VueJs|Remix|Other>
      --org=<value>                [optional] Provide the organization UID to create a new project or deployment.
      --out-dir=<value>            [optional] Output Directory.
      --redeploy-last-upload       [optional] Redeploy with last file upload
      --redeploy-latest            [optional] Redeploy latest commit/code
      --server-command=<value>     [optional] Server Command.
      --type=<option>              [optional] Type of adapters. <options: GitHub|FileUpload>
                                   <options: GitHub|FileUpload>
      --variable-type=<option>...  [optional] Provide a variable type (can specify multiple times). <options: Import
                                   variables from a stack|Manually add custom variables to the list|Import variables
                                   from the .env.local file|Skip adding environment variables>
                                   <options: Import variables from a stack|Manually add custom variables to the
                                   list|Import variables from the .env.local file|Skip adding environment variables>

DESCRIPTION
  Launch related operations

EXAMPLES
  $ csdx launch

  $ csdx launch --data-dir <path/of/current/working/dir>

  $ csdx launch --config <path/to/launch/config/file>

  $ csdx launch --type <options: GitHub|FileUpload>

  $ csdx launch --data-dir <path/of/current/working/dir> --type <options: GitHub|FileUpload>

  $ csdx launch --data-dir <path/of/current/working/dir> --redeploy-latest

  $ csdx launch --data-dir <path/of/current/working/dir> --redeploy-last-upload

  $ csdx launch --config <path/to/launch/config/file> --type <options: GitHub|FileUpload>

  $ csdx launch --environment=<value> --redeploy-latest

  $ csdx launch --config <path/to/launch/config/file> --type <options: GitHub|FileUpload> --name=<value> --environment=<value> --branch=<value> --build-command=<value> --framework=<option> --org=<value> --out-dir=<value>

  $ csdx launch --config <path/to/launch/config/file> --type <options: GitHub|FileUpload> --name=<value> --environment=<value> --branch=<value> --build-command=<value> --framework=<option> --org=<value> --out-dir=<value> --server-command=<value>

  $ csdx launch --config <path/to/launch/config/file> --type <options: GitHub|FileUpload> --name=<value> --environment=<value> --branch=<value> --build-command=<value> --framework=<option> --org=<value> --out-dir=<value> --variable-type="Import variables from a stack" --alias=<value>

  $ csdx launch --config <path/to/launch/config/file> --type <options: GitHub|FileUpload> --name=<value> --environment=<value> --branch=<value> --build-command=<value> --framework=<option> --org=<value> --out-dir=<value> --variable-type="Manually add custom variables to the list" --env-variables="APP_ENV:prod, TEST_ENV:testVal"

  $ csdx launch --config <path/to/launch/config/file> --type <options: GitHub|FileUpload> --name=<value> --environment=<value> --branch=<value> --build-command=<value> --framework=<option> --org=<value> --out-dir=<value> --variable-type="Import variables from a stack" --variable-type="Manually add custom variables to the list" --alias=<value>
```

_See code: [@contentstack/cli-launch](https://github.com/contentstack/launch-cli/blob/main/packages/contentstack-launch/src/commands/launch/index.ts)_

## `csdx launch:deployments`

Show list of deployments for an environment

```
USAGE
  $ csdx launch:deployments [-d <value>] [-c <value>] [--org <value>] [--project <value>] [-e <value>]

FLAGS
  -c, --config=<value>       Path to the local '.cs-launch.json' file
  -d, --data-dir=<value>     Current working directory
  -e, --environment=<value>  Environment name or UID
      --org=<value>          [Optional] Provide the organization UID
      --project=<value>      [Optional] Provide the project UID

DESCRIPTION
  Show list of deployments for an environment

EXAMPLES
  $ csdx launch:deployments

  $ csdx launch:deployments -d "current working directory"

  $ csdx launch:deployments -c "path to the local config file"

  $ csdx launch:deployments -e "environment number or uid" --org=<org UID> --project=<Project UID>
```

_See code: [@contentstack/cli-launch](https://github.com/contentstack/launch-cli/blob/main/packages/contentstack-launch/src/commands/launch/deployments.ts)_

## `csdx launch:environments`

Show list of environments for a project

```
USAGE
  $ csdx launch:environments [-d <value>] [-c <value>] [--org <value>] [--project <value>]

FLAGS
  -c, --config=<value>    Path to the local '.cs-launch.json' file
  -d, --data-dir=<value>  Current working directory
      --org=<value>       [Optional] Provide the organization UID
      --project=<value>   [Optional] Provide the project UID

DESCRIPTION
  Show list of environments for a project

EXAMPLES
  $ csdx launch:environments

  $ csdx launch:environments -d "current working directory"

  $ csdx launch:environments -c "path to the local config file"

  $ csdx launch:environments --org=<org UID> --project=<Project UID>
```

_See code: [@contentstack/cli-launch](https://github.com/contentstack/launch-cli/blob/main/packages/contentstack-launch/src/commands/launch/environments.ts)_

## `csdx launch:functions`

Serve cloud functions

```
USAGE
  $ csdx launch:functions [-p <value>] [-d <value>]

FLAGS
  -d, --data-dir=<value>  [default: /Users/aman.kumar/Documents/repos/v2-beta-branch/cli/packages/contentstack] Current
                          working directory
  -p, --port=<value>      [default: 3000] Port number

DESCRIPTION
  Serve cloud functions

EXAMPLES
  $ csdx launch:functions

  $ csdx launch:functions --port=port

  $ csdx launch:functions --data-dir <path/of/current/working/dir>

  $ csdx launch:functions --data-dir <path/of/current/working/dir> -p "port number"
```

_See code: [@contentstack/cli-launch](https://github.com/contentstack/launch-cli/blob/main/packages/contentstack-launch/src/commands/launch/functions.ts)_

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
      --deployment=<value>   Deployment number or UID
      --org=<value>          [Optional] Provide the organization UID
      --project=<value>      [Optional] Provide the project UID
      --type=<option>        [default: s] Type of flags to show logs. By default, these are server logs. Options [d -
                             deployment logs, s - server logs]
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

_See code: [@contentstack/cli-launch](https://github.com/contentstack/launch-cli/blob/main/packages/contentstack-launch/src/commands/launch/logs.ts)_

## `csdx launch:open`

Open a website for an environment

```
USAGE
  $ csdx launch:open [-d <value>] [-c <value>] [--org <value>] [--project <value>] [-e <value>]

FLAGS
  -c, --config=<value>       Path to the local '.cs-launch.json' file
  -d, --data-dir=<value>     Current working directory
  -e, --environment=<value>  Environment name or UID
      --org=<value>          [Optional] Provide the organization UID
      --project=<value>      [Optional] Provide the project UID

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

_See code: [@contentstack/cli-launch](https://github.com/contentstack/launch-cli/blob/main/packages/contentstack-launch/src/commands/launch/open.ts)_

## `csdx login`

User sessions login

```
USAGE
  $ csdx login [-u <value> | --oauth] [-p <value> | ]

FLAGS
  -p, --password=<value>  Password of your Contentstack app.
  -u, --username=<value>  Email address of your Contentstack account.
      --oauth             Enables single sign-on (SSO) in Contentstack CLI.

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
  -y, --yes  Force log out by skipping the confirmation.

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.55/src/commands/plugins/index.ts)_

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.55/src/commands/plugins/inspect.ts)_

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.55/src/commands/plugins/install.ts)_

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.55/src/commands/plugins/link.ts)_

## `csdx plugins:remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ csdx plugins:remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.55/src/commands/plugins/reset.ts)_

## `csdx plugins:uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ csdx plugins:uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.55/src/commands/plugins/uninstall.ts)_

## `csdx plugins:unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ csdx plugins:unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.55/src/commands/plugins/update.ts)_

## `csdx tokens`

Lists all existing tokens added to the session

```
USAGE
  $ csdx tokens [--columns <value>] [--sort <value>] [--filter <value>] [--csv] [--no-truncate]
    [--no-header] [--output csv|json|yaml]

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
