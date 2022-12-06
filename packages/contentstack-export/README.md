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

# Usage

<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli-cm-export
$ csdx COMMAND
running command...
$ csdx (-v|--version|version)
@contentstack/cli-cm-export/1.2.1 darwin-arm64 node-v16.17.0
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`csdx cm:stacks:export [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--content-types <value>] [--branch <value>] [--secured-assets]`](#csdx-cmstacksexport--c-value--k-value--d-value--a-value---module-value---content-types-value---branch-value---secured-assets)

## `csdx cm:stacks:export [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--content-types <value>] [--branch <value>] [--secured-assets]`

Export content from a stack

```
USAGE
  $ csdx cm:stacks:export [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--content-types 
  <value>] [--branch <value>] [--secured-assets]

OPTIONS
  -B, --branch=branch                [optional] branch name
  -a, --alias=alias                  alias of the management token
  -c, --config=config                [optional] path of the config
  -d, --data-dir=data-dir            path or location to store the data
  -k, --stack-api-key=stack-api-key  API key of the source stack
  -m, --module=module                [optional] specific module name
  -t, --content-types=content-types  [optional] content type
  -y, --yes                          [optional] Override marketplace apps related prompts
  --secured-assets                   [optional] use when assets are secured

ALIASES
  $ csdx cm:export

EXAMPLES
  csdx cm:stacks:export --stack-api-key <stack_api_key> --data-dir <path/of/export/destination/dir>
  csdx cm:stacks:export --config <path/to/config/dir>
  csdx cm:stacks:export --alias <management_token_alias>
  csdx cm:stacks:export --alias <management_token_alias> --data-dir <path/to/export/destination/dir>
  csdx cm:stacks:export --alias <management_token_alias> --config <path/to/config/file>
  csdx cm:stacks:export --module <single module name>
  csdx cm:stacks:export --branch [optional] branch name
```

_See code: [src/commands/cm/stacks/export.js](https://github.com/contentstack/cli/blob/main/packages/contentstack-export/src/commands/cm/stacks/export.js)_
<!-- commandsstop -->
