import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { getConfigFromEnv } from './config/app-config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = getConfigFromEnv();
  await app.listen(config.port);

  console.log(`Jira CMDB API listening on http://localhost:${config.port}${config.cmdbEndpoint}`);
  console.log(`Jira Insight source URL: ${config.jiraInsightApiUrl}`);
  console.log(
    `Lookup updater endpoint listening on http://localhost:${config.port}${config.lookupUpdateEndpoint}`,
  );
}

void bootstrap();
