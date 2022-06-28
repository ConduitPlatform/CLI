export interface PackageManifest {
  targetAbi: string,
  name: string,
  tag: string,
  image: string, // eg docker.io/library/node:fermium-bullseye-slim
  dependencies: {
    package: string, // eg redis@5.0.1
    required: boolean, // is this ALWAYS required?
    order: number // 0:n, 0 being brought up first
    // TODO: Required config / enabled based on target FEATURES
  }[],
  globalValidationScript: boolean, // available under ./validators/_global.ts
  preRunScript: boolean, // available under ./preRun.sh
  postRunScript: boolean, // available under ./postRun.sh
  features: { // eg Conduit's "gRPC-protection": if enabled, require a GRPC_TOKEN env
    name: string,
    // NOTE: At least either one of 'dependsOn' or 'validator' is required!!!
    dependsOn?: string, // package ref
    validator?: string, // path to validator function (confirms required envs are present etc)
  }[],
  defaultConfiguration: {
    env: {
      name: string,
      type: string, // validation, user input etc
      value: string,
    }[],
    ports: { // This is not an "external:internal"[] so that we can robustly validate / pick port values
      name: string,
      containerPort: number,
      hostPort: number,
    }[],
    features: string[],
  },
  // Validators:
  // a) PORT / ENV attached functions validating individual values // TODO: Pass in configs!!
  // b) Cross-arg validators run after everything else has been validated (_global.ts) // TODO: Pass in global config!
}

export interface DeploymentManifest {
  targetAbi: string, // obviously validate against used package major abi versions
  name: string,
  tag: string,
  globalValidationScript: boolean, // available under ./validators/_global.ts
  preRunScript: boolean, // available under ./preRun.sh
  postRunScript: boolean, // available under ./postRun.sh
  packages: {
    name: string, // eg @conduitplatform/database@5.0.1
    tag: string,
    required: boolean,
    runByDefault: boolean,
    order: number, // 0:n, 0 being brought up first
    defaultConfiguration?: {
      env?: {
        name: string,
        type: string,
        value: string,
      }[],
      ports?: {
        name: string,
        containerPort: number,
        hostPort: number,
      }[],
      features?: string[],
    },
  }[],

  // TODO: Script file checks:
  //       true & unavailable || false & available => throw error
  //       true && available || false & unavailable => continue
}
