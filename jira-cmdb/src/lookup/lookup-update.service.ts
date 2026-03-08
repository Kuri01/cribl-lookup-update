import { Injectable } from '@nestjs/common';

import { AppConfig } from '../config/app-config';
import { CmdbCsvSerializer } from '../cmdb/cmdb-csv.serializer';
import { CmdbRepository } from '../cmdb/cmdb.repository';
import { LookupUpdateRequest } from '../cmdb/cmdb.types';
import { CriblLookupsClient } from '../cribl/cribl-lookups.client';

export class RequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RequestValidationError';
  }
}

@Injectable()
export class LookupUpdateService {
  constructor(
    private readonly config: AppConfig,
    private readonly repository: CmdbRepository,
    private readonly serializer: CmdbCsvSerializer,
    private readonly criblClient: CriblLookupsClient,
  ) {}

  async execute(request: LookupUpdateRequest): Promise<unknown> {
    const dryRun = Boolean(request.dryRun);
    const criblBaseUrl = request.criblBaseUrl ?? this.config.defaultCriblApiBaseUrl;
    const token = request.token ?? this.config.defaultCriblToken;
    const groupName = request.groupName ?? this.config.defaultCriblGroupName;
    const mode = request.mode ?? this.config.defaultCriblLookupMode;
    const lookupIdRaw = request.lookupId ?? this.config.defaultCriblLookupId;
    const lookupId = lookupIdRaw.endsWith('.csv') ? lookupIdRaw : `${lookupIdRaw}.csv`;

    if (!criblBaseUrl) {
      throw new RequestValidationError('Missing criblBaseUrl (or CRIBL_API_BASE_URL env).');
    }

    if (!token && !dryRun) {
      throw new RequestValidationError('Missing token (or CRIBL_API_TOKEN env).');
    }

    const payload = this.repository.loadData();
    const csv = this.serializer.serialize(payload);

    if (dryRun) {
      const normalizedBase = criblBaseUrl.replace(/\/+$/, '');
      const lookupsPath = groupName
        ? `${normalizedBase}/m/${encodeURIComponent(groupName)}/system/lookups`
        : `${normalizedBase}/system/lookups`;

      return {
        dryRun: true,
        uploadUrl: `${lookupsPath}?filename=${encodeURIComponent(lookupId)}`,
        patchUrl: `${lookupsPath}/${encodeURIComponent(lookupId)}`,
        lookupId,
        rows: Math.max(0, csv.split('\n').length - 1),
        preview: csv.split('\n').slice(0, 3),
      };
    }

    const uploadResult = await this.criblClient.uploadLookupCsv({
      baseUrl: criblBaseUrl,
      groupName,
      token: token as string,
      fileName: lookupId,
      csvContent: csv,
    });

    const replaceResult = await this.criblClient.replaceLookup({
      baseUrl: criblBaseUrl,
      groupName,
      token: token as string,
      lookupId,
      uploadedTempFilename: uploadResult.filename as string,
      mode,
    });

    return {
      success: true,
      lookupId,
      uploadedTempFile: uploadResult.filename,
      criblResponse: replaceResult,
    };
  }
}
