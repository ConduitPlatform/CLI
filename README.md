conduit-cli
===========

The CLI to help you when developing conduit.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/conduit-cli.svg)](https://npmjs.org/package/conduit-cli)
[![Downloads/week](https://img.shields.io/npm/dw/conduit-cli.svg)](https://npmjs.org/package/conduit-cli)
[![License](https://img.shields.io/npm/l/conduit-cli.svg)](https://github.com/quintessential-sft/conduit/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Limitations:
* Currently, only creates schemas and only for TypeScript
# Usage
<!-- usage -->
```sh-session
$ npm install -g @quintessential-sft/conduit-cli
$ conduit COMMAND
running command...
$ conduit (-v|--version|version)
@quintessential-sft/conduit-cli/0.0.2 darwin-x64 node-v14.16.0
$ conduit --help [COMMAND]
USAGE
  $ conduit COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`conduit generateSchema [PATH]`](#conduit-generateschema-path)
* [`conduit hello [FILE]`](#conduit-hello-file)
* [`conduit help [COMMAND]`](#conduit-help-command)
* [`conduit init`](#conduit-init)

## `conduit generateSchema [PATH]`

Generate Schema TS files for CMS schemas

```
USAGE
  $ conduit generateSchema [PATH]

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  $ conduit generate-schema
  You have logged in!
```

_See code: [src/commands/generateSchema.ts](https://github.com/Quintessential-SFT/conduit/blob/v0.0.2/src/commands/generateSchema.ts)_

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.3/src/commands/help.ts)_

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
  You have logged in!
```

_See code: [src/commands/init.ts](https://github.com/Quintessential-SFT/conduit/blob/v0.0.2/src/commands/init.ts)_
<!-- commandsstop -->

#Roadmap
* Support more operations (ex. boilerplate code generation)
* Change generator functions to use a proper engine
* Support more languages for code generation
