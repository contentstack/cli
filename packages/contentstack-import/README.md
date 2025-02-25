@contentstack/cli-cm-import

It is Contentstack’s CLI plugin to import content in the stack. To learn how to export and import content in Contentstack, refer to the [Migration guide](https://www.contentstack.com/docs/developers/cli/migration/).

[![License](https://img.shields.io/npm/l/@contentstack/cli)](https://github.com/contentstack/cli/blob/main/LICENSE)it -m

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

For switching to EU region update the hosts at config/default.js

```js
{
  host:'https://eu-api.contentstack.com/v3',
  cdn: 'https://eu-cdn.contentstack.com/v3',
 ...
}
```

For switching to AZURE-NA region update the hosts at config/default.js

```js
{
  host:'https://azure-na-api.contentstack.com/v3',
  cdn: 'https://azure-na-cdn.contentstack.com/v3'
 ...
}
```

For switching to AZURE-EU region update the hosts at config/default.js

```js
{
  host:'https://azure-eu-api.contentstack.com/v3',
  cdn: 'https://azure-eu-cdn.contentstack.com/v3'
 ...
}
```

# Usage

<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli-cm-import
$ csdx COMMAND
running command...
$ csdx (--version)
@contentstack/cli-cm-import/1.19.6 darwin-arm64 node-v22.14.0
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`csdx cm:stacks:import [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--backup-dir <value>] [--branch <value>] [--import-webhook-status disable|current]`](#csdx-cmstacksimport--c-value--k-value--d-value--a-value---module-value---backup-dir-value---branch-value---import-webhook-status-disablecurrent)
* [`csdx cm:stacks:import [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--backup-dir <value>] [--branch <value>] [--import-webhook-status disable|current]`](#csdx-cmstacksimport--c-value--k-value--d-value--a-value---module-value---backup-dir-value---branch-value---import-webhook-status-disablecurrent-1)

## `csdx cm:stacks:import [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--backup-dir <value>] [--branch <value>] [--import-webhook-status disable|current]`

Import content from a stack

```
USAGE
  $ csdx cm:stacks:import [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--backup-dir <value>]
    [--branch <value>] [--import-webhook-status disable|current]

FLAGS
  -B, --branch=<value>                The name of the branch where you want to import your content. If you don't mention
                                      the branch name, then by default the content will be imported to the main branch.
  -a, --alias=<value>                 The management token of the destination stack where you will import the content.
  -b, --backup-dir=<value>            [optional] Backup directory name when using specific module.
  -c, --config=<value>                [optional] The path of the configuration JSON file containing all the options for
                                      a single run.
  -d, --data-dir=<value>              The path or the location in your file system where the content, you intend to
                                      import, is stored. For example, -d "C:\Users\Name\Desktop\cli\content". If the
                                      export folder has branches involved, then the path should point till the
                                      particular branch. For example, “-d
                                      "C:\Users\Name\Desktop\cli\content\branch_name"
  -k, --stack-api-key=<value>         API Key of the target stack
  -m, --module=<value>                [optional] Specify the module to import into the target stack. If not specified,
                                      the import command will import all the modules into the stack. The available
                                      modules are assets, content-types, entries, environments, extensions,
                                      marketplace-apps, global-fields, labels, locales, webhooks, workflows,
                                      custom-roles, and taxonomies.
  -y, --yes                           [optional] Force override all Marketplace prompts.
  --exclude-global-modules            Excludes the branch-independent module from the import operation.
  --import-webhook-status=<option>    [default: disable] [default: disable] (optional) This webhook state keeps the same
                                      state of webhooks as the source stack. <options: disable|current>
                                      <options: disable|current>
  --personalize-project-name=<value>  (optional) Provide a unique name for the Personalize project.
  --replace-existing                  Replaces the existing module in the target stack.
  --skip-app-recreation               (optional) Skips the recreation of private apps if they already exist.
  --skip-audit                        Skips the audit fix that occurs during an import operation.
  --skip-existing                     Skips the module exists warning messages.

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

  $ csdx cm:stacks:import --branch <branch name>  --yes --skip-audit
```

## `csdx cm:stacks:import [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--backup-dir <value>] [--branch <value>] [--import-webhook-status disable|current]`

Import content from a stack

```
USAGE
  $ csdx cm:stacks:import [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--backup-dir <value>]
    [--branch <value>] [--import-webhook-status disable|current]

FLAGS
  -B, --branch=<value>                The name of the branch where you want to import your content. If you don't mention
                                      the branch name, then by default the content will be imported to the main branch.
  -a, --alias=<value>                 The management token of the destination stack where you will import the content.
  -b, --backup-dir=<value>            [optional] Backup directory name when using specific module.
  -c, --config=<value>                [optional] The path of the configuration JSON file containing all the options for
                                      a single run.
  -d, --data-dir=<value>              The path or the location in your file system where the content, you intend to
                                      import, is stored. For example, -d "C:\Users\Name\Desktop\cli\content". If the
                                      export folder has branches involved, then the path should point till the
                                      particular branch. For example, “-d
                                      "C:\Users\Name\Desktop\cli\content\branch_name"
  -k, --stack-api-key=<value>         API Key of the target stack
  -m, --module=<value>                [optional] Specify the module to import into the target stack. If not specified,
                                      the import command will import all the modules into the stack. The available
                                      modules are assets, content-types, entries, environments, extensions,
                                      marketplace-apps, global-fields, labels, locales, webhooks, workflows,
                                      custom-roles, and taxonomies.
  -y, --yes                           [optional] Force override all Marketplace prompts.
  --exclude-global-modules            Excludes the branch-independent module from the import operation.
  --import-webhook-status=<option>    [default: disable] [default: disable] (optional) This webhook state keeps the same
                                      state of webhooks as the source stack. <options: disable|current>
                                      <options: disable|current>
  --personalize-project-name=<value>  (optional) Provide a unique name for the Personalize project.
  --replace-existing                  Replaces the existing module in the target stack.
  --skip-app-recreation               (optional) Skips the recreation of private apps if they already exist.
  --skip-audit                        Skips the audit fix that occurs during an import operation.
  --skip-existing                     Skips the module exists warning messages.

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

  $ csdx cm:stacks:import --branch <branch name>  --yes --skip-audit
```

_See code: [src/commands/cm/stacks/import.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-import/src/commands/cm/stacks/import.ts)_
<!-- commandsstop -->
