# Changelog

Please refer to the Contentstack Command-line Interface release notes [here](https://www.contentstack.com/docs/developers/cli/cli-changelog).

## @contentstack/cli-cm-export
### Version: 1.22.3
#### Date: January-12-2026
##### Fix:
 - Fixed error handling when empty Stack API key is provided. Now shows a clear error message instead of "tempAPIClient.stack(...).fetch is not a function"

## @contentstack/cli-cm-import
### Version: 1.30.3
#### Date: January-12-2026
##### Fix:
 - Fixed error handling when empty Stack API key is provided. Now shows a clear error message instead of SDK-related errors

## @contentstack/cli-cm-import-setup
### Version: 1.7.3
#### Date: January-12-2026
##### Fix:
 - Fixed error handling when empty Stack API key is provided. Now shows a clear error message instead of SDK-related errors
## @contentstack/cli-cm-clone
### Version: 1.8.2
#### Date:  June-30-2025
##### Fix:
 - resolve stack-clone auth failure for non-NA regions

## @contentstack/cli-config
### Version: 1.13.1
#### Date:  July-21-2025
##### Fix:
 - Improve error handling in rate limit command

## @contentstack/cli-cm-bulk-publish
### Version: 1.8.2
#### Date:  June-30-2025
##### Fix:
 - handle pagination in sync when no entries are returned.