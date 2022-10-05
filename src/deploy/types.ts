export interface DeploymentConfiguration {
  modules: string[];
  environment: { [key: string]: string };
}

export enum TagComparison {
  FirstIsNewer,
  SecondIsNewer,
  Equal,
}
