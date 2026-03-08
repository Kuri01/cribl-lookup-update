import { createApp } from './app';
import { HttpCriblLookupsClient } from './clients/http-cribl-lookups-client';
import { getConfigFromEnv } from './config';
import { FileCmdbRepository } from './repositories/file-cmdb-repository';
import { DefaultCmdbCsvSerializer } from './services/cmdb-csv-serializer';
import { LookupUpdateService } from './services/lookup-update-service';

const config = getConfigFromEnv();
const repository = new FileCmdbRepository(config.dataPath);
const serializer = new DefaultCmdbCsvSerializer();
const criblClient = new HttpCriblLookupsClient();
const lookupUpdateService = new LookupUpdateService(repository, serializer, criblClient, {
  criblBaseUrl: config.defaultCriblApiBaseUrl,
  groupName: config.defaultCriblGroupName,
  lookupId: config.defaultCriblLookupId,
  mode: config.defaultCriblLookupMode,
  token: config.defaultCriblToken,
});

const app = createApp({
  config,
  repository,
  lookupUpdateService,
});

app.listen(config.port, () => {
  console.log(`Mock Jira Insight CMDB server listening on http://localhost:${config.port}${config.cmdbEndpoint}`);
  console.log(
    `Lookup updater endpoint listening on http://localhost:${config.port}${config.lookupUpdateEndpoint}`
  );
});
