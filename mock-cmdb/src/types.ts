export type LookupMode = 'memory' | 'disk';

export type CmdbValue = {
  id?: string;
  globalId?: string;
  label?: string;
  objectKey?: string;
  objectType?: {
    id?: string;
    name?: string;
  };
  timestamp?: string;
  attributes?: Array<{
    objectTypeAttribute?: {
      name?: string;
    };
    objectAttributeValues?: Array<{
      displayValue?: string;
      value?: unknown;
    }>;
  }>;
};

export type CmdbPayload = {
  values?: CmdbValue[];
};

export type LookupUpdateRequest = {
  criblBaseUrl?: string;
  token?: string;
  groupName?: string;
  lookupId?: string;
  mode?: LookupMode;
  dryRun?: boolean;
};

export type UploadLookupResponse = {
  filename?: string;
  [key: string]: unknown;
};

export interface CmdbRepository {
  loadData(): CmdbPayload;
}

export interface CmdbCsvSerializer {
  serialize(payload: CmdbPayload): string;
}

export interface CriblLookupsClient {
  uploadLookupCsv(input: {
    baseUrl: string;
    groupName?: string;
    token: string;
    fileName: string;
    csvContent: string;
  }): Promise<UploadLookupResponse>;
  replaceLookup(input: {
    baseUrl: string;
    groupName?: string;
    token: string;
    lookupId: string;
    uploadedTempFilename: string;
    mode?: LookupMode;
  }): Promise<unknown>;
}
