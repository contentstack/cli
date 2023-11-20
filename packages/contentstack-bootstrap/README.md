Contentstack CLI’s “Bootstrap” plugin enables you to automate the process of setting up projects for sample and starter apps in Contentstack.

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
$ csdx (--version)
@contentstack/cli-cm-bootstrap/1.6.2 darwin-arm64 node-v20.8.0
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

_See code: [src/commands/cm/bootstrap.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-bootstrap/src/commands/cm/bootstrap.ts)_
<!-- commandsstop -->
