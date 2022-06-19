import { Command } from '@oclif/command';
import axios, { AxiosResponse } from 'axios';
import { storeSecurityClientConfiguration, recoverSecurityClientConfig } from '../utils/requestUtils';
import { IGetSecurityClients } from '../interfaces';
import * as os from 'os';

export class Requests {
  private readonly command: Command;
  private readonly URL: string;
  private readonly baseHeaders: {
    masterkey: string;
  };
  private token?: string;
  private clientValidation: {
    enabled: boolean,
    clientId?: string,
    clientSecret?: string,
  } = { enabled: false };

  constructor(command: Command, url: string, masterKey: string) {
    this.command = command;
    this.URL = url;
    this.baseHeaders = {
      masterkey: masterKey,
    };
    // Interceptors
    const self = this;
    axios.interceptors.request.use(
      (config) => {
        config.headers = self.getRequestHeaders();
        return config;
      },
      (error) => {
        console.log(error);
        return Promise.reject(error.response);
      }
    );
  }

  async initialize(username: string, password: string) {
    this.token = await this.loginRequest(username, password);
    const securityConfig = await this.getModuleConfig('security')
      .catch(() => {
        console.log('Failed to retrieve Conduit Security configuration');
        process.exit(-1);
      });
    if (securityConfig.clientValidation.enabled) {
      this.clientValidation.enabled = true;
      let securityClient = await recoverSecurityClientConfig(this.command)
        .catch(() => { return { clientId: '', clientSecret: '' } });
      if (!await this.validSecurityClient(securityClient.clientId)) {
        securityClient = await this.createSecurityClient();
      }
      this.clientValidation.clientId = securityClient.clientId;
      this.clientValidation.clientSecret = securityClient.clientSecret;
    }
  }

  private getRequestHeaders() {
    return {
      ...this.baseHeaders,
      ...(this.token && { Authorization: `JWT ${this.token}` }),
    };
  }

  get securityClient() {
    return this.clientValidation.enabled
      ? { clientId: this.clientValidation.clientId!, clientSecret: this.clientValidation.clientSecret! }
      : null;
  }

  // API Requests
  async httpHealthCheck() {
    return axios.get(`${this.URL}/health`)
      .then(() => true)
      .catch(() => false);
  }

  loginRequest(username: string, password: string): Promise<string> {
    return axios
      .post(`${this.URL}/admin/login`, {
        username,
        password,
      })
      .then((r: AxiosResponse<{token: string}>) => {
        this.token = r.data.token;
        return this.token;
      });
  }

  getSchemasRequest(skip: number, limit: number) {
    return axios
      .get(`${this.URL}/admin/database/schemas`, { params: { skip, limit } })
      .then((r) => r.data);
  }

  getAdminModulesRequest() {
    return axios.get(`${this.URL}/admin/config/modules`).then(r => r.data);
  }

  getModuleConfig(module: string) {
    return axios.get(`${this.URL}/admin/config/${module}`).then(r => r.data.config);
  }

  fetchSecurityClients() {
    if (!this.clientValidation.enabled) {
      throw new Error('Security Clients are disabled');
    }
    return axios.get(`${this.URL}/admin/security/client`).then((r: IGetSecurityClients) => r.data.clients);
  }

  async createSecurityClient() {
    if (!this.clientValidation.enabled) {
      throw new Error('Security Clients are disabled');
    }
    const hostname = os.hostname;
    const uniqueSuffix = (Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(36)).substring(0, 6);
    const securityClient = await axios.post(
      `${this.URL}/admin/security/client`,
      {
        platform: 'CLI',
        alias: `cli-${hostname}_${uniqueSuffix}`,
        notes: `A Conduit CLI Client for ${hostname}`,
      },
    ).then(r => { return { clientId: r.data.clientId, clientSecret: r.data.clientSecret } })
    await storeSecurityClientConfiguration(this.command, securityClient);
    return securityClient;
  }

  async validSecurityClient(clientId: string) {
    const clients = await this.fetchSecurityClients();
    return clients.some(client => client.clientId === clientId);
  }
}
