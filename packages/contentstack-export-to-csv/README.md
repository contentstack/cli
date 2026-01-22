# @contentstack/cli-cm-export-to-csv

Export entries, taxonomies, terms, or organization users to CSV files.

> **Note**: This is a TypeScript rewrite of the original `contentstack-export-to-csv` package.

## Installation

```sh-session
$ npm install -g @contentstack/cli-cm-export-to-csv
```

## Usage

```sh-session
$ csdx cm:export-to-csv [OPTIONS]
```

## Commands

### `csdx cm:export-to-csv`

Export entries, taxonomies, terms, or organization users to CSV.

```
USAGE
  $ csdx cm:export-to-csv [--action <entries|users|teams|taxonomies>] [--alias <alias>]
    [--org <org-uid>] [--stack-api-key <api-key>] [--locale <locale>]
    [--content-type <uid>] [--branch <branch>] [--delimiter <char>]

FLAGS
  -a, --alias=<value>          Alias of the management token
  -k, --stack-api-key=<value>  API Key of the source stack
  -n, --stack-name=<value>     Name of the stack for CSV filename
  --action=<option>            Export action [options: entries, users, teams, taxonomies]
  --branch=<value>             Branch from which entries will be exported
  --content-type=<value>       Content type of entries to export
  --delimiter=<value>          [default: ,] CSV delimiter character
  --fallback-locale=<value>    Fallback locale for taxonomy export
  --include-fallback           Include fallback locale data for taxonomies
  --locale=<value>             Locale of entries to export
  --org=<value>                Organization UID
  --org-name=<value>           Organization name for CSV filename
  --taxonomy-uid=<value>       Taxonomy UID for specific taxonomy export
  --team-uid=<value>           Team UID for specific team export

EXAMPLES
  $ csdx cm:export-to-csv

  $ csdx cm:export-to-csv --action entries --locale en-us --alias my-token --content-type blog_post

  $ csdx cm:export-to-csv --action users --org blt123456789

  $ csdx cm:export-to-csv --action teams --org blt123456789

  $ csdx cm:export-to-csv --action taxonomies --alias my-token --taxonomy-uid categories
```

## Output

CSV files are written to a `./data/` directory in the current working directory.

| Action | Output File Pattern |
|--------|---------------------|
| entries | `{stackName}_{contentType}_{locale}_entries_export.csv` |
| users | `{orgName}_users_export.csv` |
| teams | `{orgName}_teams_export.csv` |
| taxonomies | `{stackName}_taxonomies.csv` |

## Development

```sh-session
# Install dependencies
$ pnpm install

# Build
$ pnpm build

# Run tests
$ pnpm test

# Lint
$ pnpm lint
```

## License

MIT
