export interface DeploymentConfiguration {
  // tag: string; // TODO: We could support multiple deployments per tag too...
  modules: string[];
  environment: { [key: string]: string };
}
