import path from 'node:path';

export type LookupMode = 'memory' | 'disk';

export class AppConfig {
  port: number;
  dataPath: string;
  cmdbEndpoint: string;
  lookupUpdateEndpoint: string;
  defaultCriblApiBaseUrl: string;
  defaultCriblGroupName?: string;
  defaultCriblLookupId: string;
  defaultCriblLookupMode?: LookupMode;
  defaultCriblToken?: string;

  constructor(input: {
    port: number;
    dataPath: string;
    cmdbEndpoint: string;
    lookupUpdateEndpoint: string;
    defaultCriblApiBaseUrl: string;
    defaultCriblGroupName?: string;
    defaultCriblLookupId: string;
    defaultCriblLookupMode?: LookupMode;
    defaultCriblToken?: string;
  }) {
    this.port = input.port;
    this.dataPath = input.dataPath;
    this.cmdbEndpoint = input.cmdbEndpoint;
    this.lookupUpdateEndpoint = input.lookupUpdateEndpoint;
    this.defaultCriblApiBaseUrl = input.defaultCriblApiBaseUrl;
    this.defaultCriblGroupName = input.defaultCriblGroupName;
    this.defaultCriblLookupId = input.defaultCriblLookupId;
    this.defaultCriblLookupMode = input.defaultCriblLookupMode;
    this.defaultCriblToken = input.defaultCriblToken;
  }
}

export function getConfigFromEnv(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return new AppConfig({
    port: Number(env.PORT) || 3000,
    dataPath: env.CMDB_DATA_PATH || path.resolve(process.cwd(), 'data.json'),
    cmdbEndpoint: env.ENDPOINT || '/insight/objects',
    lookupUpdateEndpoint: env.LOOKUP_UPDATE_ENDPOINT || '/cribl/lookups/update',
    defaultCriblApiBaseUrl: env.CRIBL_API_BASE_URL || 'http://leader1:9000/api/v1',
    defaultCriblGroupName: env.CRIBL_GROUP_NAME,
    defaultCriblLookupId: env.CRIBL_LOOKUP_ID || 'jira_cmdb_mock.csv',
    defaultCriblLookupMode: env.CRIBL_LOOKUP_MODE as LookupMode | undefined,
    defaultCriblToken: env.CRIBL_API_TOKEN,
  });
}
