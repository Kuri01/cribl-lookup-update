import path from 'node:path';

import { LookupMode } from './types';

export type AppConfig = {
  port: number;
  dataPath: string;
  cmdbEndpoint: string;
  lookupUpdateEndpoint: string;
  defaultCriblApiBaseUrl: string;
  defaultCriblGroupName?: string;
  defaultCriblLookupId: string;
  defaultCriblLookupMode?: LookupMode;
  defaultCriblToken?: string;
};

export function getConfigFromEnv(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: Number(env.PORT) || 3000,
    dataPath: path.resolve(__dirname, '..', 'data.json'),
    cmdbEndpoint: env.ENDPOINT || '/insight/objects',
    lookupUpdateEndpoint: env.LOOKUP_UPDATE_ENDPOINT || '/cribl/lookups/update',
    defaultCriblApiBaseUrl: env.CRIBL_API_BASE_URL || 'http://leader1:9000/api/v1',
    defaultCriblGroupName: env.CRIBL_GROUP_NAME,
    defaultCriblLookupId: env.CRIBL_LOOKUP_ID || 'jira_cmdb_mock.csv',
    defaultCriblLookupMode: env.CRIBL_LOOKUP_MODE as LookupMode | undefined,
    defaultCriblToken: env.CRIBL_API_TOKEN,
  };
}
