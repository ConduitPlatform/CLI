conduit-cli
===========

The CLI to help you when developing conduit.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)

[//]: # ([![Version]&#40;https://img.shields.io/npm/v/conduit-cli.svg&#41;]&#40;https://npmjs.org/package/conduit-cli&#41;)

[//]: # ([![Downloads/week]&#40;https://img.shields.io/npm/dw/conduit-cli.svg&#41;]&#40;https://npmjs.org/package/conduit-cli&#41;)

[//]: # ([![License]&#40;https://img.shields.io/npm/l/conduit-cli.svg&#41;]&#40;https://github.com/ConduitPlatform/CLI/blob/master/package.json&#41;)

<!-- toc -->
* [Limitations:](#limitations)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Limitations:
* Currently, only creates schemas and only for TypeScript

# Usage
<!-- usage -->
```sh-session
$ npm install -g @conduitplatform/conduit-cli
$ conduit COMMAND
running command...
$ conduit (--version|-v)
@conduitplatform/conduit-cli/0.0.2 darwin-x64 node-v18.4.0
$ conduit --help [COMMAND]
USAGE
  $ conduit COMMAND
...
```
<!-- usagestop -->

# Commands
<!-- commands -->
* [`conduit demo cleanup`](#conduit-demo-cleanup)
* [`conduit demo setup`](#conduit-demo-setup)
* [`conduit demo start`](#conduit-demo-start)
* [`conduit demo stop`](#conduit-demo-stop)
* [`conduit generateClient graphql`](#conduit-generateclient-graphql)
* [`conduit generateClient rest`](#conduit-generateclient-rest)
* [`conduit generateSchema [PATH]`](#conduit-generateschema-path)
* [`conduit help [COMMAND]`](#conduit-help-command)
* [`conduit init`](#conduit-init)

## `conduit demo cleanup`

Removes your local Conduit demo deployment

```
USAGE
  $ conduit demo cleanup [--silent]

FLAGS
  --silent

DESCRIPTION
  Removes your local Conduit demo deployment
```

## `conduit demo setup`

Bootstraps a local Conduit demo deployment with minimal configuration

```
USAGE
  $ conduit demo setup [--config]

FLAGS
  --config  Enable manual deployment configuration

DESCRIPTION
  Bootstraps a local Conduit demo deployment with minimal configuration
```

## `conduit demo start`

Spins up your local Conduit demo deployment

```
USAGE
  $ conduit demo start

DESCRIPTION
  Spins up your local Conduit demo deployment
```

## `conduit demo stop`

Terminates your local Conduit demo deployment

```
USAGE
  $ conduit demo stop [--silent]

FLAGS
  --silent

DESCRIPTION
  Terminates your local Conduit demo deployment
```

## `conduit generateClient graphql`

Generates a GraphQL client library for Conduit's GraphQL API

```
USAGE
  $ conduit generateClient graphql [-t <value>] [-p <value>]

FLAGS
  -p, --output-path=<value>  Path to store archived library in
  -t, --client-type=<value>  The client type to generate a library for

DESCRIPTION
  Generates a GraphQL client library for Conduit's GraphQL API
```

## `conduit generateClient rest`

Generates a REST API client library for Conduit'S REST API

```
USAGE
  $ conduit generateClient rest [-t <value>] [-p <value>]

FLAGS
  -p, --output-path=<value>  Path to store archived library in
  -t, --client-type=<value>  The client type to generate a library for

DESCRIPTION
  Generates a REST API client library for Conduit'S REST API
```

## `conduit generateSchema [PATH]`

Generate Schema TS files for registered Conduit schemas

```
USAGE
  $ conduit generateSchema [PATH]

DESCRIPTION
  Generate Schema TS files for registered Conduit schemas

EXAMPLES
  $ conduit generate-schema
  ...
  Generating schemas
```

_See code: [dist/commands/generateSchema.ts](https://github.com/ConduitPlatform/CLI/blob/v0.0.2/dist/commands/generateSchema.ts)_

## `conduit help [COMMAND]`

Display help for conduit.

```
USAGE
  $ conduit help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for conduit.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.12/src/commands/help.ts)_

## `conduit init`

Initialize the CLI to communicate with Conduit

```
USAGE
  $ conduit init [-r]

FLAGS
  -r, --relogin  Reuses url and master key from existing configuration

DESCRIPTION
  Initialize the CLI to communicate with Conduit

EXAMPLES
  $ conduit init
  ...
  Attempting login
  Login Successful!
```

_See code: [dist/commands/init.ts](https://github.com/ConduitPlatform/CLI/blob/v0.0.2/dist/commands/init.ts)_
<!-- commandsstop -->

#Roadmap
* Support more operations (ex. boilerplate code generation)
* Change generator functions to use a proper engine
* Support more languages for code generation
