conduit-cli
===========

The CLI to help you when developing conduit.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg?style=for-the-badge)](https://oclif.io)
![npm (scoped)](https://img.shields.io/npm/v/@conduitplatform/cli?style=for-the-badge)

[//]: # ([![Version]&#40;https://img.shields.io/npm/v/conduit-cli.svg&#41;]&#40;https://npmjs.org/package/conduit-cli&#41;)

[//]: # ([![Downloads/week]&#40;https://img.shields.io/npm/dw/conduit-cli.svg&#41;]&#40;https://npmjs.org/package/@conduitplatform/cli&#41;)

[//]: # ([![License]&#40;https://img.shields.io/npm/l/conduit-cli.svg&#41;]&#40;https://github.com/ConduitPlatform/CLI/blob/main/package.json&#41;)

<!-- toc -->
* [Limitations:](#limitations)
* [Usage](#usage)
* [Commands](#commands)
* [Roadmap](#roadmap)
<!-- tocstop -->

# Limitations:
* Currently, only creates schemas and only for TypeScript

# Usage
<!-- usage -->
```sh-session
$ npm install -g @conduitplatform/cli
$ conduit COMMAND
running command...
$ conduit (--version|-v)
@conduitplatform/cli/0.0.6 linux-x64 node-v16.15.0
$ conduit --help [COMMAND]
USAGE
  $ conduit COMMAND
...
```
<!-- usagestop -->

# Commands
<!-- commands -->
* [`conduit deploy rm`](#conduit-deploy-rm)
* [`conduit deploy setup`](#conduit-deploy-setup)
* [`conduit deploy start`](#conduit-deploy-start)
* [`conduit deploy stop`](#conduit-deploy-stop)
* [`conduit generateClient graphql`](#conduit-generateclient-graphql)
* [`conduit generateClient rest`](#conduit-generateclient-rest)
* [`conduit generateSchema [PATH]`](#conduit-generateschema-path)
* [`conduit help [COMMAND]`](#conduit-help-command)
* [`conduit init`](#conduit-init)

## `conduit deploy rm`

Bring down a local Conduit deployment

```
USAGE
  $ conduit deploy rm [-t <value>]

FLAGS
  -t, --target=<value>  Specify target deployment

DESCRIPTION
  Bring down a local Conduit deployment
```

## `conduit deploy setup`

Bootstrap a local Conduit deployment

```
USAGE
  $ conduit deploy setup [--config]

FLAGS
  --config  Enable manual deployment configuration

DESCRIPTION
  Bootstrap a local Conduit deployment
```

## `conduit deploy start`

Bring up a local Conduit deployment

```
USAGE
  $ conduit deploy start [-t <value>]

FLAGS
  -t, --target=<value>  Specify target deployment

DESCRIPTION
  Bring up a local Conduit deployment
```

## `conduit deploy stop`

Bring down a local Conduit deployment

```
USAGE
  $ conduit deploy stop [-t <value>]

FLAGS
  -t, --target=<value>  Specify target deployment

DESCRIPTION
  Bring down a local Conduit deployment
```

## `conduit generateClient graphql`

Generate client libraries for your Conduit GraphQL APIs

```
USAGE
  $ conduit generateClient graphql [-t <value>] [-p <value>]

FLAGS
  -p, --output-path=<value>  Path to store archived library in
  -t, --client-type=<value>  The client type to generate a library for

DESCRIPTION
  Generate client libraries for your Conduit GraphQL APIs
```

## `conduit generateClient rest`

Generate client libraries for your Conduit REST APIs

```
USAGE
  $ conduit generateClient rest [-t <value>] [-p <value>]

FLAGS
  -p, --output-path=<value>  Path to store archived library in
  -t, --client-type=<value>  The client type to generate a library for

DESCRIPTION
  Generate client libraries for your Conduit REST APIs
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

_See code: [src/commands/generateSchema.ts](https://github.com/ConduitPlatform/CLI/blob/v0.0.5/src/commands/generateSchema.ts)_

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

_See code: [src/commands/init.ts](https://github.com/ConduitPlatform/CLI/blob/v0.0.5/src/commands/init.ts)_
<!-- commandsstop -->

# Roadmap
* Support more operations (ex. boilerplate code generation)
* Change generator functions to use a proper engine
* Support more languages for code generation
