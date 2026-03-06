import { Command } from '@oclif/core';
import axios from 'axios';
import type {
  StateExportResponse,
  StateImportBody,
  StateImportResponse,
  ConfigImportResponse,
} from '../interfaces/state';

export class Requests {
  private readonly command: Command;
  private readonly adminUrl: string;
  private readonly apiToken: string;
  private readonly appUrl?: string;

  constructor(command: Command, adminUrl: string, apiToken: string, appUrl?: string) {
    this.command = command;
    this.adminUrl = adminUrl;
    this.apiToken = apiToken;
    this.appUrl = appUrl;
  }

  private getRequestHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiToken}`,
    };
  }

  /** For use by generateClient and other consumers that need auth headers. */
  getAuthHeaders(): Record<string, string> {
    return this.getRequestHeaders();
  }

  /**
   * Verify connection to the admin API using the API token.
   * Used after init and by getRequestClient.
   */
  async verifyConnection(): Promise<boolean> {
    try {
      const res = await axios.get(`${this.adminUrl}/ready`, {
        headers: this.getRequestHeaders(),
      });
      return res.data?.result === 'Conduit Core is online!';
    } catch {
      return false;
    }
  }

  get adminBaseUrl(): string {
    return this.adminUrl;
  }

  get applicationUrl(): string | undefined {
    return this.appUrl;
  }

  // API Requests
  getSchemasRequest(skip: number, limit: number) {
    return axios
      .get(`${this.adminUrl}/database/schemas`, {
        params: { skip, limit },
        headers: this.getRequestHeaders(),
      })
      .then(r => r.data);
  }

  getModulesRequest() {
    return axios
      .get(`${this.adminUrl}/config/modules`, { headers: this.getRequestHeaders() })
      .then(r => r.data);
  }

  getModuleConfig(module: string) {
    return axios
      .get(`${this.adminUrl}/config/${module}`, { headers: this.getRequestHeaders() })
      .then(r => r.data.config);
  }

  stateExport(): Promise<StateExportResponse> {
    return axios
      .get(`${this.adminUrl}/state/export`, { headers: this.getRequestHeaders() })
      .then(r => r.data);
  }

  stateImport(body: StateImportBody): Promise<StateImportResponse> {
    return axios
      .post(`${this.adminUrl}/state/import`, body, { headers: this.getRequestHeaders() })
      .then(r => r.data);
  }

  configImport(config: {
    modules: Record<string, object>;
  }): Promise<ConfigImportResponse> {
    return axios
      .post(
        `${this.adminUrl}/config/import`,
        { config },
        { headers: this.getRequestHeaders() },
      )
      .then(r => r.data);
  }
}
