/**
 * Types for Conduit state export/import API (GET /admin/state/export, POST /admin/state/import).
 */

export interface StateExportResponse {
  configs: {
    modules: Record<string, object>;
  };
  modules: Record<string, Record<string, unknown[]>>;
}

export interface StateImportBody {
  configs?: {
    modules: Record<string, object>;
  };
  modules?: Record<string, Record<string, unknown[]>>;
}

export interface ConfigResult {
  success: boolean;
  error?: string;
}

export interface ModuleImportResultEntry {
  created?: number;
  updated?: number;
  failed?: number;
  errors?: string[];
  error?: string;
}

export interface StateImportResponse {
  configResults: Record<string, ConfigResult>;
  moduleResults: Record<
    string,
    Record<string, ModuleImportResultEntry> | { error: string }
  >;
}

export interface ConfigImportResponse {
  results: Record<string, ConfigResult>;
}
