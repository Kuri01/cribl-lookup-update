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
  username?: string;
  password?: string;
  groupName?: string;
  lookupId?: string;
  mode?: 'memory' | 'disk';
  deploy?: boolean;
  dryRun?: boolean;
};

export type UploadLookupResponse = {
  filename?: string;
  [key: string]: unknown;
};
