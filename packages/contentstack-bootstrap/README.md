Contentstack CLI’s “Bootstrap” plugin enables you to automate the process of setting up projects for sample and starter apps  in Contentstack.

This means that all the required steps such as stack, environment, and content type creation, entry and asset publishing are performed just by using a single command.

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli-cm-bootstrap
$ csdx COMMAND
running command...
$ csdx (-v|--version|version)
@contentstack/cli-cm-bootstrap/1.0.6 linux-x64 node-v16.14.2
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
* [`csdx cm:bootstrap`](#csdx-cmbootstrap)

## `csdx cm:bootstrap`

Bootstrap contentstack apps

```
USAGE
  $ csdx cm:bootstrap

OPTIONS
  -a, --appName=appName          App name, reactjs-starter, nextjs-starter, gatsby-starter, angular-starter,
                                 nuxt-starter

  -d, --directory=directory      Directory to setup the project. If directory name has a space then provide the path as
                                 a string or escap the space using back slash eg: "../../test space" or ../../test\
                                 space

  -t, --accessToken=accessToken  Access token for private github repo

EXAMPLES
  $ csdx cm:bootstrap
  $ csdx cm:bootstrap -d <path/to/setup/the/app>
  $ csdx cm:bootstrap -t <github access token>
```

_See code: [src/commands/cm/bootstrap.ts](https://github.com/contentstack/cli/blob/v1.0.6/src/commands/cm/bootstrap.ts)_
<!-- commandsstop -->
