## Description
This plugin allows you to quickly import existing Stacks that are needed to run sample apps.

<!-- usagestop -->
## Commands
<!-- commands -->
* [`csdx cm:seed`](#csdx-seed)

## `csdx cm:seed`

create a Stack from existing content types, entries, assets, etc.

```
USAGE
  $ csdx seed

OPTIONS
  -r, --repo=repo  GitHub account or GitHub account and repository

EXAMPLES
  $ csdx cm:seed
  $ csdx cm:seed -r "account"
  $ csdx cm:seed -r "account/repository"
```

_See code: [src/commands/seed.ts](https://github.com/contentstack/cli/packages/contentstack-seed/blob/v1.0.5/src/commands/cm/seed.ts)_
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
