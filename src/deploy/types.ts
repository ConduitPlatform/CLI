export interface DeploymentConfiguration {
  modules: string[];
  environment: { [key: string]: string };
}
