# @contentstack/cli-cm-export

It is Contentstack’s CLI plugin to export content from the stack. To learn how to export and import content in Contentstack, refer to the [Migration guide](https://www.contentstack.com/docs/developers/cli/migration/).

[![License](https://img.shields.io/npm/l/@contentstack/cli)](https://github.com/contentstack/cli/blob/main/LICENSE)

<!-- toc -->
* [@contentstack/cli-cm-export](#contentstackcli-cm-export)
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
  cdn: 'https://azure-na-cdn.contentstack.com/v3',
 ...
}
```

For switching to AZURE-EU region update the hosts at config/default.js

```js
{
  host:'https://azure-eu-api.contentstack.com/v3',
  cdn: 'https://azure-eu-cdn.contentstack.com/v3',
 ...
}
```

# Usage

<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli-cm-export
$ csdx COMMAND
running command...
$ csdx (--version)
@contentstack/cli-cm-export/2.0.0-beta.3 darwin-arm64 node-v24.12.0
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`csdx cm:stacks:export [--config <value>] [--stack-api-key <value>] [--data-dir <value>] [--alias <value>] [--module <value>] [--content-types <value>] [--branch <value>] [--secured-assets]`](#csdx-cmstacksexport---config-value---stack-api-key-value---data-dir-value---alias-value---module-value---content-types-value---branch-value---secured-assets)

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
                                  workflows, custom-roles, taxonomies, and composable-studio.
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

_See code: [src/commands/cm/stacks/export.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/stacks/export.ts)_
<!-- commandsstop -->
