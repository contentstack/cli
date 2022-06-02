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
@contentstack/cli-cm-export/1.0.0 darwin-x64 node-v16.14.2
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`csdx cm:stacks:export`](#csdx-cmstacksexport)

## `csdx cm:stacks:export`

Export content from a stack

```
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
  -t, --content-types=content-types                    [optional] content type
  --data-dir=data-dir                                  path or location to store the data
  --secured-assets                                     [optional] use when assets are secured

DESCRIPTION
  ...
  Export content from one stack to another

ALIASES
  $ csdx cm:export

EXAMPLES
  csdx cm:stacks:export -k <stack_ApiKey> -d <path/of/export/destination/dir>
  csdx cm:stacks:export -c <path/to/config/dir>
  csdx cm:stacks:export -a <management_token_alias>
  csdx cm:stacks:export -a <management_token_alias> --data-dir <path/to/export/destination/dir>
  csdx cm:stacks:export -a <management_token_alias> -c <path/to/config/file>
  csdx cm:stacks:export --module <single module name>
  csdx cm:stacks:export --branch [optional] branch name
```

_See code: [src/commands/cm/stacks/export.js](https://github.com/contentstack/cli/blob/v1.0.0/packages/contentstack-export/src/commands/cm/stacks/export.js)_
<!-- commandsstop -->
