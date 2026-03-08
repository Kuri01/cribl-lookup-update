import { Injectable } from '@nestjs/common';

import { AppConfig } from '../config/app-config';
import { CmdbCsvSerializer } from '../cmdb/cmdb-csv.serializer';
import { CmdbRepository } from '../cmdb/cmdb.repository';
import { LookupUpdateRequest } from '../cmdb/cmdb.types';
import { CriblApiError, CriblLookupsClient } from '../cribl/cribl-lookups.client';

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
    const explicitToken = request.token ?? this.config.defaultCriblToken;
    const username = request.username ?? this.config.defaultCriblUsername;
    const password = request.password ?? this.config.defaultCriblPassword;
    const groupName = request.groupName ?? this.config.defaultCriblGroupName;
    const mode = request.mode ?? this.config.defaultCriblLookupMode;
    const lookupIdRaw = request.lookupId ?? this.config.defaultCriblLookupId;
    const lookupId = lookupIdRaw.endsWith('.csv') ? lookupIdRaw : `${lookupIdRaw}.csv`;

    if (!criblBaseUrl) {
      throw new RequestValidationError('Missing criblBaseUrl (or CRIBL_API_BASE_URL env).');
    }

    if (!explicitToken && !dryRun && (!username || !password)) {
      throw new RequestValidationError(
        'Missing auth. Provide token or username/password (env: CRIBL_API_TOKEN or CRIBL_API_USERNAME + CRIBL_API_PASSWORD).',
      );
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

    const token =
      explicitToken ||
      (await this.criblClient.login({
        baseUrl: criblBaseUrl,
        username: username as string,
        password: password as string,
      }));

    const uploadResult = await this.criblClient.uploadLookupCsv({
      baseUrl: criblBaseUrl,
      groupName,
      token,
      fileName: lookupId,
      csvContent: csv,
    });

    const uploadedTempFilename = uploadResult.filename as string;
    let result: unknown;
    let operation: 'replaced' | 'created' = 'replaced';

    try {
      result = await this.criblClient.replaceLookup({
        baseUrl: criblBaseUrl,
        groupName,
        token,
        lookupId,
        uploadedTempFilename,
        mode,
      });
    } catch (error) {
      if (!this.isLookupMissingError(error)) throw error;

      result = await this.criblClient.createLookup({
        baseUrl: criblBaseUrl,
        groupName,
        token,
        lookupId,
        uploadedTempFilename,
        mode,
      });
      operation = 'created';
    }

    return {
      success: true,
      operation,
      lookupId,
      uploadedTempFile: uploadResult.filename,
      criblResponse: result,
    };
  }

  private isLookupMissingError(error: unknown): boolean {
    if (!(error instanceof CriblApiError)) return false;
    if (error.status !== 400) return false;

    if (typeof error.responseBody !== 'object' || error.responseBody === null) return false;
    const message = (error.responseBody as { message?: unknown }).message;
    if (typeof message !== 'string') return false;
    return /does not exist/i.test(message);
  }
}
