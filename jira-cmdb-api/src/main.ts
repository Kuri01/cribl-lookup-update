import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { getConfigFromEnv } from './config/app-config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = getConfigFromEnv();
  await app.listen(config.port);

  console.log(`Mock Jira Insight CMDB server listening on http://localhost:${config.port}${config.cmdbEndpoint}`);
  console.log(
    `Lookup updater endpoint listening on http://localhost:${config.port}${config.lookupUpdateEndpoint}`,
  );
}

void bootstrap();
