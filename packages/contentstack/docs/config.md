`csdx config`
=============

perform configuration related activities

* [`csdx config:get:region`](#csdx-configgetregion)
* [`csdx config:set:region [REGION]`](#csdx-configsetregion-region)

## `csdx config:get:region`

Get current region set for CLI

```
Get current region set for CLI


USAGE
  $ csdx config:get:region
```

_See code: [src/commands/config/get/region.js](https://github.com/contentstack/cli/blob/v0.1.1-beta.6/src/commands/config/get/region.js)_

## `csdx config:set:region [REGION]`

Set region for CLI

```
Set region for CLI


USAGE
  $ csdx config:set:region [REGION]

ARGUMENTS
  REGION  (EU|NA) North America(NA), Europe (EU)

OPTIONS
  -d, --cda=cda    Custom host to set for content delivery API, if this flag is added then cma and name flags are
                   required

  -m, --cma=cma    Custom host to set for content management API, , if this flag is added then cda and name flags are
                   required

  -n, --name=name  Name for the region, if this flag is added then cda and cma flags are required

EXAMPLES
  $ csdx config:set:region EU
  $ csdx config:set:region --cma <contentstack_cma_endpoint> --cda <contentstack_cda_endpoint> --name "India"
  $ csdx config:set:region --cma="https://in-api.contentstack.com" --cda="https://in-cda.contentstack.com" 
  --name="India"
```

_See code: [src/commands/config/set/region.js](https://github.com/contentstack/cli/blob/v0.1.1-beta.6/src/commands/config/set/region.js)_
