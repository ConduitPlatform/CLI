import { Command, CliUx } from '@oclif/core';
import axios, { AxiosResponse } from 'axios';
import {
  storeSecurityClientConfiguration,
  recoverSecurityClientConfig,
} from '../utils/requestUtils';
import { IGetSecurityClients } from '../interfaces';
import * as os from 'os';

export class Requests {
  private readonly command: Command;
  private readonly adminUrl: string;
  private readonly appUrl?: string;
  private baseHeaders: {
    [header: string]: string;
  } = {};
  private token?: string;
  private clientValidation: {
    enabled: boolean;
    clientId?: string;
    clientSecret?: string;
  } = { enabled: false };

  constructor(command: Command, adminUrl: string, appUrl?: string) {
    this.command = command;
    this.adminUrl = adminUrl;
    this.appUrl = appUrl;
  }

  async initialize(
    username: string,
    password: string,
    masterKey: string,
    usesRouter: boolean,
  ) {
    this.baseHeaders['masterkey'] = masterKey;
    axios.interceptors.request.use(
      config => {
        config.headers = this.getRequestHeaders();
        return config;
      },
      error => {
        return Promise.reject(error.response);
      },
    );
    this.token = await this.loginRequest(username, password);
    if (usesRouter) {
      const routerConfig = await this.getModuleConfig('router').catch(async () => {
        CliUx.ux.log('Please make sure Conduit Router is online before proceeding.');
        process.exit(-1);
      });
      if (routerConfig.security.clientValidation.enabled) {
        this.clientValidation.enabled = true;
        let securityClient = await recoverSecurityClientConfig(this.command).catch(() => {
          return { clientId: '', clientSecret: '' };
        });
        if (!(await this.validSecurityClient(securityClient.clientId))) {
          securityClient = await this.createSecurityClient();
        }
        this.clientValidation.clientId = securityClient.clientId;
        this.clientValidation.clientSecret = securityClient.clientSecret;
      }
    }
  }

  private getRequestHeaders() {
    return {
      ...this.baseHeaders,
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    };
  }

  get securityClient() {
    return this.clientValidation.enabled
      ? {
          clientId: this.clientValidation.clientId!,
          clientSecret: this.clientValidation.clientSecret!,
        }
      : null;
  }

  // API Requests
  async httpHealthCheck(api: 'admin' | 'app') {
    // NOTE: This won't work for: v0.14.0, v0.14.1, v0.14.2, v0.14.3, v0.14.4
    if (api === 'app' && !this.appUrl) {
      CliUx.ux.error('No Application API url specified. Health check failed.', {
        exit: -1,
      });
    }
    let pingRoutes: string[];
    if (api === 'admin') {
      pingRoutes = [`${this.adminUrl}/ready`];
    } else {
      pingRoutes = [
        `${this.appUrl}/ready`,
        `${this.appUrl}/health`, // fallback: <=v0.14.4
      ];
    }
    for (const route of pingRoutes) {
      const success = await axios
        .get(route)
        .then(res => {
          return (
            res.data.result ===
            (api === 'app' ? 'Conduit is online!' : 'Conduit Core is online!')
          );
        })
        .catch(() => false);
      if (success) return true;
    }
    return false;
  }

  loginRequest(username: string, password: string): Promise<string> {
    return axios
      .post(`${this.adminUrl}/login`, {
        username,
        password,
      })
      .then((r: AxiosResponse<{ token: string }>) => {
        this.token = r.data.token;
        return this.token;
      });
  }

  getSchemasRequest(skip: number, limit: number) {
    return axios
      .get(`${this.adminUrl}/database/schemas`, { params: { skip, limit } })
      .then(r => r.data);
  }

  getModulesRequest() {
    return axios.get(`${this.adminUrl}/config/modules`).then(r => r.data);
  }

  getModuleConfig(module: string) {
    return axios.get(`${this.adminUrl}/config/${module}`).then(r => r.data.config);
  }

  fetchSecurityClients() {
    if (!this.clientValidation.enabled) {
      throw new Error('Security Clients are disabled');
    }
    return axios
      .get(`${this.adminUrl}/router/security/client`)
      .then((r: IGetSecurityClients) => r.data.clients);
  }

  async createSecurityClient() {
    if (!this.clientValidation.enabled) {
      throw new Error('Security Clients are disabled');
    }
    const hostname = os.hostname;
    const uniqueSuffix = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
      .toString(36)
      .substring(0, 6);
    const securityClient = await axios
      .post(`${this.adminUrl}/router/security/client`, {
        platform: 'CLI',
        alias: `cli-${hostname}_${uniqueSuffix}`,
        notes: `A Conduit CLI Client for ${hostname}`,
      })
      .then(r => {
        return { clientId: r.data.clientId, clientSecret: r.data.clientSecret };
      });
    await storeSecurityClientConfiguration(this.command, securityClient);
    return securityClient;
  }

  async validSecurityClient(clientId: string) {
    const clients = await this.fetchSecurityClients();
    return clients.some(client => client.clientId === clientId);
  }
}
