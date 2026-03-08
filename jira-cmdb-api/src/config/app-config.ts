export type LookupMode = 'memory' | 'disk';

export class AppConfig {
  port: number;
  jiraInsightApiUrl: string;
  cmdbEndpoint: string;
  lookupUpdateEndpoint: string;
  defaultCriblApiBaseUrl: string;
  defaultCriblGroupName?: string;
  defaultCriblLookupId: string;
  defaultCriblLookupMode?: LookupMode;
  defaultCriblToken?: string;
  defaultCriblUsername?: string;
  defaultCriblPassword?: string;

  constructor(input: {
    port: number;
    jiraInsightApiUrl: string;
    cmdbEndpoint: string;
    lookupUpdateEndpoint: string;
    defaultCriblApiBaseUrl: string;
    defaultCriblGroupName?: string;
    defaultCriblLookupId: string;
    defaultCriblLookupMode?: LookupMode;
    defaultCriblToken?: string;
    defaultCriblUsername?: string;
    defaultCriblPassword?: string;
  }) {
    this.port = input.port;
    this.jiraInsightApiUrl = input.jiraInsightApiUrl;
    this.cmdbEndpoint = input.cmdbEndpoint;
    this.lookupUpdateEndpoint = input.lookupUpdateEndpoint;
    this.defaultCriblApiBaseUrl = input.defaultCriblApiBaseUrl;
    this.defaultCriblGroupName = input.defaultCriblGroupName;
    this.defaultCriblLookupId = input.defaultCriblLookupId;
    this.defaultCriblLookupMode = input.defaultCriblLookupMode;
    this.defaultCriblToken = input.defaultCriblToken;
    this.defaultCriblUsername = input.defaultCriblUsername;
    this.defaultCriblPassword = input.defaultCriblPassword;
  }
}

export function getConfigFromEnv(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return new AppConfig({
    port: Number(env.PORT) || 3000,
    jiraInsightApiUrl: env.JIRA_INSIGHT_API_URL || 'http://mock-jira-insight:3000/insight/objects',
    cmdbEndpoint: env.ENDPOINT || '/insight/objects',
    lookupUpdateEndpoint: env.LOOKUP_UPDATE_ENDPOINT || '/cribl/lookups/update',
    defaultCriblApiBaseUrl: env.CRIBL_API_BASE_URL || 'http://leader1:9000/api/v1',
    defaultCriblGroupName: env.CRIBL_GROUP_NAME,
    defaultCriblLookupId: env.CRIBL_LOOKUP_ID || 'jira_cmdb_mock.csv',
    defaultCriblLookupMode: env.CRIBL_LOOKUP_MODE as LookupMode | undefined,
    defaultCriblToken: env.CRIBL_API_TOKEN,
    defaultCriblUsername: env.CRIBL_API_USERNAME,
    defaultCriblPassword: env.CRIBL_API_PASSWORD,
  });
}
