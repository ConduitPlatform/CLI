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
$ conduit (-v|--version|version)
@conduitplatform/conduit-cli/0.0.2 linux-x64 node-v14.19.0
$ conduit --help [COMMAND]
USAGE
  $ conduit COMMAND
...
```
<!-- usagestop -->

# Commands
<!-- commands -->
* [`conduit generateSchema [PATH]`](#conduit-generateschema-path)
* [`conduit help [COMMAND]`](#conduit-help-command)
* [`conduit init`](#conduit-init)

## `conduit generateSchema [PATH]`

Generate Schema TS files for registered Conduit schemas

```
USAGE
  $ conduit generateSchema [PATH]

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  $ conduit generate-schema
  ...
  Generating schemas
```

_See code: [src/commands/generateSchema.ts](https://github.com/ConduitPlatform/CLI/blob/main/src/commands/generateSchema.ts)_

## `conduit help [COMMAND]`

display help for conduit

```
USAGE
  $ conduit help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.3.1/src/commands/help.ts)_

## `conduit init`

Initialize the CLI to communicate with Conduit

```
USAGE
  $ conduit init

OPTIONS
  -h, --help             show CLI help
  -r, --relogin=relogin  Reuses url and master key

EXAMPLE
  $ conduit init
  ...
  Attempting login
  Login Successful!
```

_See code: [src/commands/init.ts](https://github.com/ConduitPlatform/CLI/blob/main/src/commands/init.ts)_
<!-- commandsstop -->

#Roadmap
* Support more operations (ex. boilerplate code generation)
* Change generator functions to use a proper engine
* Support more languages for code generation
