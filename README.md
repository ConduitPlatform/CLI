<div align="center">
    <br>
    <a href="https://getconduit.dev" target="_blank"><img src="https://getconduit.dev/conduitLogo.svg" height="80px" alt="logo"/></a>
    <br/>
    <h3>The only Backend you'll ever need.</h3>
</div>

# Conduit CLI

The Conduit CLI helps you run Conduit locally and manage configuration as code. Use it to try Conduit quickly, run a project-backed deployment from a `.conduit` folder, or sync state (configs, schemas, resources) with a remote instance.

## Requirements

- **Node.js 22+** (use `nvm use` if you have an `.nvmrc` in the repo)
- **Docker** with [Docker Compose v2](https://docs.docker.com/compose/install/) (CLI uses `docker compose` only)
- Docker must be running; the CLI will not start the daemon for you

## Installation

```bash
npm install -g @conduitplatform/cli
```

## Testing

Run tests locally from the CLI repository root:

```bash
yarn test
yarn test:coverage
```

Useful focused suites:

```bash
yarn test:unit
yarn test:commands
yarn test:integration
yarn test:watch
```

Guidelines:
- Behavior changes should include tests.
- Bug fixes should include regression tests.
- Command and flag changes should include command-level test coverage.
- Default test runs should stay local and deterministic (no real Docker/network requirement).

## Quick start (try Conduit)

To spin up a local Conduit instance without a project:

1. Run `conduit deploy setup` and follow the prompts (pick a Conduit version, database, and optional modules).
2. Run `conduit deploy start` to bring up the stack. The UI will open at http://localhost:8080 when ready.
3. Use `conduit deploy stop` to stop, and `conduit deploy rm` to remove the deployment (optionally with `--wipe-data`).

## Project mode (.conduit folder)

When your project has a `.conduit` folder with a `conduit.yml` manifest, the CLI can start a local Conduit deployment that matches that spec and keep deployment and state in sync.

1. **Initialize:** `conduit project init` creates `.conduit/conduit.yml` (version, database, optional modules).
2. **Start:** `conduit project up` downloads compose files for the manifest version, starts the stack with the right profiles, and optionally runs `state push` if `.conduit/configs/` or `.conduit/modules/` exist. For localhost project deployments, the CLI now attempts automatic local credential bootstrap before state apply.
3. **Stop:** `conduit project down` stops the project’s deployment.
4. **Modules:** `conduit project module add <name>` and `conduit project module rm <name>` update the manifest and, if the stack is running, apply the change.
5. **Preflight:** `conduit project doctor` validates Docker, compose, `.conduit/conduit.yml`, and common local port conflicts.

Example `conduit.yml`:

```yaml
version: "latest"
database: mongodb
modules:
  - chat
  - storage
```

## Connecting to an instance

Run `conduit init` and provide your Conduit admin URL and an API token (from Settings > API Tokens in the admin UI). This is required for `state pull`, `state push`, and `state diff`. In project mode against localhost, `conduit project up` attempts automatic local bootstrap first; for remote targets or failures, `conduit init` remains the fallback. Use `--admin-url` and `--token` (or env vars `CONDUIT_ADMIN_URL`, `CONDUIT_API_TOKEN`) for non-interactive use.

## State management

State is stored under a directory (default: `.conduit`) as YAML:

- **`conduit state pull`** – Export configs and module resources from the remote instance into `configs/` and `modules/<module>/<resourceType>/`.
- **`conduit state push`** – Import from those files into the remote instance. Use `--dry-run`, `--configs-only`, or `--modules-only` as needed.
- **`conduit state diff`** – Show differences between local state files and the remote instance. Use `--fail-on-drift` in CI.

## Troubleshooting quick checks

- Run `conduit project doctor` before `project up` to validate local prerequisites.
- If state apply fails with auth, run `conduit init --relogin`.
- If state apply fails with payload validation, run `conduit state diff` and fix drift.
- If Docker startup fails, run `docker compose logs` for the active deployment.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg?style=for-the-badge)](https://oclif.io)
![npm (scoped)](https://img.shields.io/npm/v/@conduitplatform/cli?style=for-the-badge)

[//]: # ([![Version]&#40;https://img.shields.io/npm/v/conduit-cli.svg&#41;]&#40;https://npmjs.org/package/conduit-cli&#41;)

[//]: # ([![Downloads/week]&#40;https://img.shields.io/npm/dw/conduit-cli.svg&#41;]&#40;https://npmjs.org/package/@conduitplatform/cli&#41;)

[//]: # ([![License]&#40;https://img.shields.io/npm/l/conduit-cli.svg&#41;]&#40;https://github.com/ConduitPlatform/CLI/blob/main/package.json&#41;)

<!-- toc -->
* [Conduit CLI](#conduit-cli)
* [Usage](#usage)
* [Commands](#commands)
* [Roadmap](#roadmap)
<!-- tocstop -->

# Usage
<!-- usage -->
```sh-session
$ npm install -g @conduitplatform/cli
$ conduit COMMAND
running command...
$ conduit (--version|-v)
@conduitplatform/cli/0.0.15 darwin-arm64 node-v22.16.0
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
* [`conduit deploy update`](#conduit-deploy-update)
* [`conduit init`](#conduit-init)
* [`conduit project down`](#conduit-project-down)
* [`conduit project doctor`](#conduit-project-doctor)
* [`conduit project init`](#conduit-project-init)
* [`conduit project module add NAME`](#conduit-project-module-add-name)
* [`conduit project module rm NAME`](#conduit-project-module-rm-name)
* [`conduit project status`](#conduit-project-status)
* [`conduit project up`](#conduit-project-up)
* [`conduit state diff`](#conduit-state-diff)
* [`conduit state pull`](#conduit-state-pull)
* [`conduit state push`](#conduit-state-push)

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

_See code: [src/commands/deploy/rm.ts](https://github.com/ConduitPlatform/CLI/blob/v0.0.15/src/commands/deploy/rm.ts)_

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

_See code: [src/commands/deploy/setup.ts](https://github.com/ConduitPlatform/CLI/blob/v0.0.15/src/commands/deploy/setup.ts)_

## `conduit deploy start`

Bring up your local Conduit deployment

```
USAGE
  $ conduit deploy start

DESCRIPTION
  Bring up your local Conduit deployment
```

_See code: [src/commands/deploy/start.ts](https://github.com/ConduitPlatform/CLI/blob/v0.0.15/src/commands/deploy/start.ts)_

## `conduit deploy stop`

Bring down your local Conduit deployment

```
USAGE
  $ conduit deploy stop

DESCRIPTION
  Bring down your local Conduit deployment
```

_See code: [src/commands/deploy/stop.ts](https://github.com/ConduitPlatform/CLI/blob/v0.0.15/src/commands/deploy/stop.ts)_

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

_See code: [src/commands/deploy/update.ts](https://github.com/ConduitPlatform/CLI/blob/v0.0.15/src/commands/deploy/update.ts)_

## `conduit init`

Initialize the CLI to communicate with Conduit (using an API token)

```
USAGE
  $ conduit init [--admin-url <value>] [--token <value>] [--app-url <value>] [-r]

FLAGS
  -r, --relogin            Reuse admin URL (and optionally app URL) from existing configuration
      --admin-url=<value>  [env: CONDUIT_ADMIN_URL] Administrative API URL of your Conduit installation
      --app-url=<value>    [env: CONDUIT_APP_URL] Application API URL (optional, for Conduit Router)
      --token=<value>      [env: CONDUIT_API_TOKEN] API token (cdt_...) from Conduit admin panel (Settings > API Tokens)

DESCRIPTION
  Initialize the CLI to communicate with Conduit (using an API token)

EXAMPLES
  $ conduit init
  ...
  Verifying connection
  Connected successfully!

  $ conduit init --admin-url https://admin.example.com --token cdt_xxxx
```

_See code: [src/commands/init.ts](https://github.com/ConduitPlatform/CLI/blob/v0.0.15/src/commands/init.ts)_

## `conduit project down`

Stop local Conduit started from .conduit/conduit.yml

```
USAGE
  $ conduit project down [--dir <value>]

FLAGS
  --dir=<value>  [default: .conduit] Path to .conduit directory

DESCRIPTION
  Stop local Conduit started from .conduit/conduit.yml
```

_See code: [src/commands/project/down.ts](https://github.com/ConduitPlatform/CLI/blob/v0.0.15/src/commands/project/down.ts)_

## `conduit project init`

Initialize a Conduit project (creates .conduit/conduit.yml)

```
USAGE
  $ conduit project init [--dir <value>]

FLAGS
  --dir=<value>  [default: .conduit] Path to .conduit directory

DESCRIPTION
  Initialize a Conduit project (creates .conduit/conduit.yml)

EXAMPLES
  $ conduit project init

  $ conduit project init --dir .conduit
```

_See code: [src/commands/project/init.ts](https://github.com/ConduitPlatform/CLI/blob/v0.0.15/src/commands/project/init.ts)_

## `conduit project doctor`

Run local preflight checks for Conduit project workflows

```
USAGE
  $ conduit project doctor [--dir <value>]

FLAGS
  --dir=<value>  [default: .conduit] Path to .conduit directory

DESCRIPTION
  Run local preflight checks for Conduit project workflows
```

_See code: [src/commands/project/doctor.ts](https://github.com/ConduitPlatform/CLI/blob/v0.0.15/src/commands/project/doctor.ts)_

## `conduit project module add NAME`

Add an optional module to .conduit/conduit.yml

```
USAGE
  $ conduit project module add NAME [--dir <value>]

ARGUMENTS
  NAME  (chat|email|forms|push-notifications|sms|storage) Module name to add

FLAGS
  --dir=<value>  [default: .conduit] Path to .conduit directory

DESCRIPTION
  Add an optional module to .conduit/conduit.yml

EXAMPLES
  $ conduit project module add chat
```

_See code: [src/commands/project/module/add.ts](https://github.com/ConduitPlatform/CLI/blob/v0.0.15/src/commands/project/module/add.ts)_

## `conduit project module rm NAME`

Remove an optional module from .conduit/conduit.yml

```
USAGE
  $ conduit project module rm NAME [--dir <value>]

ARGUMENTS
  NAME  Module name to remove

FLAGS
  --dir=<value>  [default: .conduit] Path to .conduit directory

DESCRIPTION
  Remove an optional module from .conduit/conduit.yml

EXAMPLES
  $ conduit project module rm chat
```

_See code: [src/commands/project/module/rm.ts](https://github.com/ConduitPlatform/CLI/blob/v0.0.15/src/commands/project/module/rm.ts)_

## `conduit project status`

Show Conduit project and deployment status

```
USAGE
  $ conduit project status [--dir <value>] [--drift]

FLAGS
  --dir=<value>  [default: .conduit] Path to .conduit directory
  --drift        Compare local .conduit state with the running deployment

DESCRIPTION
  Show Conduit project and deployment status
```

_See code: [src/commands/project/status.ts](https://github.com/ConduitPlatform/CLI/blob/v0.0.15/src/commands/project/status.ts)_

## `conduit project up`

Start local Conduit from .conduit/conduit.yml

```
USAGE
  $ conduit project up [--dir <value>] [--no-state-push]

FLAGS
  --dir=<value>    [default: .conduit] Path to .conduit directory
  --no-state-push  Do not run state push after UI is healthy

DESCRIPTION
  Start local Conduit from .conduit/conduit.yml
```

_See code: [src/commands/project/up.ts](https://github.com/ConduitPlatform/CLI/blob/v0.0.15/src/commands/project/up.ts)_

## `conduit state diff`

Show differences between local state files and remote Conduit state

```
USAGE
  $ conduit state diff [--dir <value>] [--fail-on-drift]

FLAGS
  --dir=<value>         [default: .conduit] Directory containing local state files (default: .conduit)
  --fail-on-drift       Exit non-zero when differences are detected (useful in CI)

DESCRIPTION
  Show differences between local state files and remote Conduit state

EXAMPLES
  $ conduit state diff

  $ conduit state diff --dir .conduit
```

_See code: [src/commands/state/diff.ts](https://github.com/ConduitPlatform/CLI/blob/v0.0.15/src/commands/state/diff.ts)_

## `conduit state pull`

Pull Conduit state from the remote instance and write to local YAML files

```
USAGE
  $ conduit state pull [--dir <value>] [--clean]

FLAGS
  --clean        Remove existing state files before writing
  --dir=<value>  [default: .conduit] Directory to write state files (default: .conduit)

DESCRIPTION
  Pull Conduit state from the remote instance and write to local YAML files

EXAMPLES
  $ conduit state pull

  $ conduit state pull --dir .conduit --clean
```

_See code: [src/commands/state/pull.ts](https://github.com/ConduitPlatform/CLI/blob/v0.0.15/src/commands/state/pull.ts)_

## `conduit state push`

Push local Conduit state (YAML files) to the remote instance

```
USAGE
  $ conduit state push [--dir <value>] [--dry-run] [--configs-only] [--modules-only]

FLAGS
  --configs-only  Import only configs
  --dir=<value>   [default: .conduit] Directory containing state files (default: .conduit)
  --dry-run       Show what would be imported without applying
  --modules-only  Import only module resources

DESCRIPTION
  Push local Conduit state (YAML files) to the remote instance

EXAMPLES
  $ conduit state push

  $ conduit state push --dry-run

  $ conduit state push --configs-only
```

_See code: [src/commands/state/push.ts](https://github.com/ConduitPlatform/CLI/blob/v0.0.15/src/commands/state/push.ts)_
<!-- commandsstop -->

# Roadmap

- Project mode: support version pinning (e.g. release tags) in `conduit.yml`
- State: document and support module-specific export/import where applicable
