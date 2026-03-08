import { Module } from '@nestjs/common';

import { AppConfig, getConfigFromEnv } from './config/app-config';
import { CmdbController } from './cmdb/cmdb.controller';
import { CmdbCsvSerializer } from './cmdb/cmdb-csv.serializer';
import { CmdbRepository } from './cmdb/cmdb.repository';
import { CriblLookupsClient } from './cribl/cribl-lookups.client';
import { LookupUpdateService } from './lookup/lookup-update.service';

@Module({
  imports: [],
  controllers: [CmdbController],
  providers: [
    {
      provide: AppConfig,
      useFactory: getConfigFromEnv,
    },
    CmdbRepository,
    LookupUpdateService,
    CmdbCsvSerializer,
    CriblLookupsClient,
  ],
})
export class AppModule {}
