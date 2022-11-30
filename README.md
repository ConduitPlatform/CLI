<div align="center">
    <br>
    <a href="https://getconduit.dev" target="_blank"><img src="https://getconduit.dev/conduitLogo.svg" height="80px" alt="logo"/></a>
    <br/>
    <h3>The only Backend you'll ever need.</h3>
</div>

# Conduit CLI

Conduit's CLI is a multipurpose tool that's meant to facilitate your development experience and speed up your work
regardless of whether you're deploying a Conduit instance for your project, developing custom modules or even
contributing to the upstream project in your spare time.

If you treat it right, it's gonna deploy local instances of Conduit for you, provide API client library generation for
your frontend team, generate some TypeScript code for your custom modules and even handle your laundry... nah, wait I
thought we were not actually releasing this one until the next release, right?

Anyway, point is, if you're already using Conduit for your projects or 
simply intend to give it a ride for the first time, you're most likely going to want to use this.

## Requirements

While the use of Docker is not required for every single piece of functionality provided, for most typical use cases
you're going to [need Docker installed](https://docs.docker.com/get-docker) and configured so that your user is capable
of utilizing it without superuser privileges.<br />
For Linux users, this usually means adding your user to the `docker` group.

You're also going to need some form of support for [docker compose](https://docs.docker.com/compose/install/).<br />
Conduit's CLI supports both v2 and v1. The former comes pre-installed with the latest versions of Docker Desktop.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg?style=for-the-badge)](https://oclif.io)
![npm (scoped)](https://img.shields.io/npm/v/@conduitplatform/cli?style=for-the-badge)

[//]: # ([![Version]&#40;https://img.shields.io/npm/v/conduit-cli.svg&#41;]&#40;https://npmjs.org/package/conduit-cli&#41;)

[//]: # ([![Downloads/week]&#40;https://img.shields.io/npm/dw/conduit-cli.svg&#41;]&#40;https://npmjs.org/package/@conduitplatform/cli&#41;)

[//]: # ([![License]&#40;https://img.shields.io/npm/l/conduit-cli.svg&#41;]&#40;https://github.com/ConduitPlatform/CLI/blob/main/package.json&#41;)

<!-- toc -->
* [Conduit CLI](#conduit-cli)
* [Limitations](#limitations)
* [Usage](#usage)
* [Commands](#commands)
* [Roadmap](#roadmap)
<!-- tocstop -->

# Limitations

While the CLI is capable of bootstrapping any Conduit release, including legacy ones,
 `generateSchema` and `generateClient` commands currently require that you target >= v0.14.5.

# Usage
<!-- usage -->
```sh-session
$ npm install -g @conduitplatform/cli
$ conduit COMMAND
running command...
$ conduit (--version|-v)
@conduitplatform/cli/0.0.7 linux-x64 node-v16.15.0
$ conduit --help [COMMAND]
USAGE
  $ conduit COMMAND
...
```
<!-- usagestop -->

# Commands
<!-- commands -->
* [`conduit cli update`](#conduit-cli-update)
* [`conduit deploy rm`](#conduit-deploy-rm)
* [`conduit deploy setup`](#conduit-deploy-setup)
* [`conduit deploy start`](#conduit-deploy-start)
* [`conduit deploy stop`](#conduit-deploy-stop)
* [`conduit deploy update`](#conduit-deploy-update)
* [`conduit generateClient graphql`](#conduit-generateclient-graphql)
* [`conduit generateClient rest`](#conduit-generateclient-rest)
* [`conduit generateSchema [PATH]`](#conduit-generateschema-path)
* [`conduit help [COMMAND]`](#conduit-help-command)
* [`conduit init`](#conduit-init)

## `conduit cli update`

Update your CLI

```
USAGE
  $ conduit cli update

DESCRIPTION
  Update your CLI
```

## `conduit deploy rm`

Remove your local Conduit deployment

```
USAGE
  $ conduit deploy rm [--wipe-data] [--defaults]

FLAGS
  --defaults   Select default values
  --wipe-data  Wipe data volumes

DESCRIPTION
  Remove your local Conduit deployment
```

## `conduit deploy setup`

Bootstrap a local Conduit deployment

```
USAGE
  $ conduit deploy setup [--config] [--target <value>]

FLAGS
  --config          Enable manual deployment configuration
  --target=<value>  Specify target tag

DESCRIPTION
  Bootstrap a local Conduit deployment
```

## `conduit deploy start`

Bring up your local Conduit deployment

```
USAGE
  $ conduit deploy start

DESCRIPTION
  Bring up your local Conduit deployment
```

## `conduit deploy stop`

Bring down your local Conduit deployment

```
USAGE
  $ conduit deploy stop

DESCRIPTION
  Bring down your local Conduit deployment
```

## `conduit deploy update`

Update your local Conduit deployment

```
USAGE
  $ conduit deploy update [--config] [--target <value>]

FLAGS
  --config          Enable manual deployment configuration
  --target=<value>  Specify target tag

DESCRIPTION
  Update your local Conduit deployment
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
  -r, --relogin  Reuses API urls and master key from existing configuration

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
