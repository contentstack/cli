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
@contentstack/cli-cm-export/0.1.1-beta.10 linux-x64 node-v12.22.7
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`csdx cm:export`](#csdx-cmexport)

## `csdx cm:export`

Export content from a stack

```
USAGE
  $ csdx cm:export

OPTIONS
  -A, --auth-token                                     to use auth token
  -B, --branch=branch                                  [optional] branch name
  -a, --management-token-alias=management-token-alias  alias of the management token
  -c, --config=config                                  [optional] path of the config
  -d, --data=data                                      path or location to store the data
  -m, --module=module                                  [optional] specific module name
  -s, --stack-uid=stack-uid                            API key of the source stack
  -t, --content-type=content-type                      [optional] content type
  --secured-assets                                     [optional] use when assets are secured

DESCRIPTION
  ...
  Export content from one stack to another

EXAMPLES
  csdx cm:export -A
  csdx cm:export -A -s <stack_ApiKey> -d <path/of/export/destination/dir>
  csdx cm:export -A -c <path/to/config/dir>
  csdx cm:export -A -m <single module name>
  csdx cm:export -A --secured-assets
  csdx cm:export -a <management_token_alias>
  csdx cm:export -a <management_token_alias> -d <path/to/export/destination/dir>
  csdx cm:export -a <management_token_alias> -c <path/to/config/file>
  csdx cm:export -A -m <single module name>
  csdx cm:export -A -m <single module name> -t <content type>
  csdx cm:export -A -B [optional] branch name
```

_See code: [src/commands/cm/export.js](https://github.com/contentstack/cli/blob/v0.1.1-beta.10/packages/contentstack-export/src/commands/cm/export.js)_
<!-- commandsstop -->
