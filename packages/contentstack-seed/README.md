## Description
The “seed” command in Contentstack CLI allows users to import content to your stack, from Github repositories. It's an effective command that can help you to migrate content to your stack with minimal steps.

To import content to your stack, you can choose from the following two sources:

**Contentstack’s organization**: In this organization, we have provided sample content, which you can import directly to your stack using the seed command.

**Github’s repository**: You can import content available on Github’s repository belonging to an organization or an individual.

<!-- usagestop -->
## Commands
<!-- commands -->
* [`csdx cm:stacks:seed [--repo <value>] [--org <value>] [-k <value>] [-n <value>] [-y <value>] [-s <value>] [--locale <value>]`](#csdx-cmstacksseed---repo-value---org-value--k-value--n-value--y-value--s-value---locale-value)
* [`csdx cm:stacks:seed [--repo <value>] [--org <value>] [-k <value>] [-n <value>] [-y <value>] [-s <value>] [--locale <value>]`](#csdx-cmstacksseed---repo-value---org-value--k-value--n-value--y-value--s-value---locale-value-1)

## `csdx cm:stacks:seed [--repo <value>] [--org <value>] [-k <value>] [-n <value>] [-y <value>] [-s <value>] [--locale <value>]`

Create a stack from existing content types, entries, assets, etc

```
USAGE
  $ csdx cm:stacks:seed [--repo <value>] [--org <value>] [-k <value>] [-n <value>] [-y <value>] [-s <value>] [--locale
    <value>]

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

## `csdx cm:stacks:seed [--repo <value>] [--org <value>] [-k <value>] [-n <value>] [-y <value>] [-s <value>] [--locale <value>]`

Create a stack from existing content types, entries, assets, etc

```
USAGE
  $ csdx cm:stacks:seed [--repo <value>] [--org <value>] [-k <value>] [-n <value>] [-y <value>] [-s <value>] [--locale
    <value>]

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

_See code: [src/commands/cm/stacks/seed.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-seed/src/commands/cm/stacks/seed.ts)_
<!-- commandsstop -->

## Advanced Flags
The following flags allow you to host and import Stacks from your own GitHub repository.
The account name can be a personal user account, organization account, or enterprise account.

```
  $ csdx cm:seed -r "account/repository"
```

**Step 1.** Export a Stack

Identify a Stack that you would like to export.
This stack might be used in conjunction with a sample web site or mobile app you have created.

Now, run `csdx cm:export` against it. The following documentation explains the [Export Plugin](https://www.contentstack.com/docs/developers/cli/export-content-using-cli/).

In most cases, running `csdx cm:export -A` or `csdx cm:export -a "management token"` should work for you.

The `csdx cm:seed` plugin uses the same libraries as `csdx cm:import`.

**Step 2.** GitHub

Once the Stack is exported:

* Create a GitHub repository.
    * By convention, your repository name should be prefixed with `stack-`. For example: `stack-your-starter-app`.
      Doing so will allow the stack names to be found by the interactive prompt when running `csdx cm:seed -r "account"`.
      This step is optional. You can fully qualify the repository name if required: `csdx cm:seed -r "account/repo`.
* Create a folder named `stack` within the newly created GitHub repository
* Take the content from **Step 1** and commit it to the `stack` folder
* Create a [Release](https://docs.github.com/en/free-pro-team@latest/github/administering-a-repository/managing-releases-in-a-repository)

The latest release will be downloaded and extracted, when a user attempts to install a Stack using:

```
$ csdx cm:seed -r "account"
$ csdx cm:seed -r "account/repository"
```

## Documentation
To get more detailed documentation of this command, visit the Seed command documentation on our [docs](https://www.contentstack.com/docs/developers/cli/import-content-using-the-seed-command/).
