@contentstack/cli-cm-clone
==========================

It is Contentstack’s CLI plugin to clone a stack. Using this command, you can export a stack’s content/schema to a new or existing stack. Refer to the [Clone a Stack](https://www.contentstack.com/docs/developers/cli/clone-a-stack/) documentation to learn more.


<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli-cm-clone
$ csdx COMMAND
running command...
$ csdx (-v|--version|version)
@contentstack/cli-cm-clone/1.1.2 darwin-x64 node-v16.18.0
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->
```sh-session
$ npm install -g @contentstack/cli-cm-clone
$ csdx COMMAND
running command...
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
# Commands
<!-- commands -->
* [`csdx cm:stacks:clone [--source-branch <value>] [--target-branch <value>] [--source-management-token-alias <value>] [--destination-management-token-alias <value>] [-n <value>] [--type a|b] [--source-stack-api-key <value>] [--destination-stack-api-key <value>] [--import-webhook-status disable|current]`](#csdx-cmstacksclone---source-branch-value---target-branch-value---source-management-token-alias-value---destination-management-token-alias-value--n-value---type-ab---source-stack-api-key-value---destination-stack-api-key-value---import-webhook-status-disablecurrent)

## `csdx cm:stacks:clone [--source-branch <value>] [--target-branch <value>] [--source-management-token-alias <value>] [--destination-management-token-alias <value>] [-n <value>] [--type a|b] [--source-stack-api-key <value>] [--destination-stack-api-key <value>] [--import-webhook-status disable|current]`

Clone data (structure/content or both) of a stack into another stack

```
USAGE
  $ csdx cm:stacks:clone [--source-branch <value>] [--target-branch <value>] [--source-management-token-alias <value>] 
  [--destination-management-token-alias <value>] [-n <value>] [--type a|b] [--source-stack-api-key <value>] 
  [--destination-stack-api-key <value>] [--import-webhook-status disable|current]

OPTIONS
  -n, --stack-name=stack-name                                              Name for the new stack to store the cloned
                                                                           content.

  -y, --yes                                                                [optional] Override marketplace prompts

  --destination-management-token-alias=destination-management-token-alias  Source API key of the target stack token
                                                                           alias.

  --destination-stack-api-key=destination-stack-api-key                    Destination stack API Key

  --import-webhook-status=disable|current                                  [default: disable] Webhook state

  --source-branch=source-branch                                            Branch of the source stack.

  --source-management-token-alias=source-management-token-alias            Source API key of the target stack token
                                                                           alias.

  --source-stack-api-key=source-stack-api-key                              Source stack API Key

  --target-branch=target-branch                                            Branch of the target stack.

  --type=a|b                                                               Type of data to clone
                                                                           a) Structure (all modules except entries &
                                                                           assets)
                                                                           b) Structure with content (all modules
                                                                           including entries & assets)

DESCRIPTION
  Use this plugin to automate the process of cloning a stack in few steps.

ALIASES
  $ csdx cm:stack-clone

EXAMPLES
  csdx cm:stacks:clone
  csdx cm:stacks:clone --source-branch <source-branch-name> --target-branch <target-branch-name> --yes
  csdx cm:stacks:clone --source-stack-api-key <apiKey> --destination-stack-api-key <apiKey>
  csdx cm:stacks:clone --source-management-token-alias <management token alias> --destination-management-token-alias 
  <management token alias>
  csdx cm:stacks:clone --source-branch --target-branch --source-management-token-alias <management token alias> 
  --destination-management-token-alias <management token alias>
  csdx cm:stacks:clone --source-branch --target-branch --source-management-token-alias <management token alias> 
  --destination-management-token-alias <management token alias> --type <value a or b>
```

_See code: [src/commands/cm/stacks/clone.js](https://github.com/contentstack/cli/blob/main/packages/contentstack-clone/src/commands/cm/stacks/clone.js)_
<!-- commandsstop -->
