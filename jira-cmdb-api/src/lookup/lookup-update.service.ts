import { Injectable } from '@nestjs/common';

import { AppConfig } from '../config/app-config';
import { CmdbCsvSerializer } from '../cmdb/cmdb-csv.serializer';
import { CmdbRepository } from '../cmdb/cmdb.repository';
import { LookupUpdateRequest } from '../cmdb/cmdb.types';
import {
  CriblApiError,
  CriblLookupsClient,
  DeployLookupsPayload,
  GroupInfoResponse,
} from '../cribl/cribl-lookups.client';

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
    const shouldDeploy = request.deploy ?? true;
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
    if (shouldDeploy && !dryRun && !groupName) {
      throw new RequestValidationError('Missing groupName required for deploy (or CRIBL_GROUP_NAME env).');
    }

    if (!explicitToken && !dryRun && (!username || !password)) {
      throw new RequestValidationError(
        'Missing auth. Provide token or username/password (env: CRIBL_API_TOKEN or CRIBL_API_USERNAME + CRIBL_API_PASSWORD).',
      );
    }

    const payload = await this.repository.loadData();
    const csv = this.serializer.serialize(payload);

    if (dryRun) {
      const normalizedBase = criblBaseUrl.replace(/\/+$/, '');
      const lookupsPath = groupName
        ? `${normalizedBase}/m/${encodeURIComponent(groupName)}/system/lookups`
        : `${normalizedBase}/system/lookups`;

      return {
        dryRun: true,
        deploy: shouldDeploy,
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

    let deployResult: unknown = null;
    let lookupVersion: string | null = null;
    if (shouldDeploy) {
      lookupVersion = this.extractLookupVersion(result);
      if (!lookupVersion) {
        throw new RequestValidationError('Could not determine lookup version for deploy.');
      }
      const groupInfo = await this.criblClient.getGroupInfo({
        baseUrl: criblBaseUrl,
        groupName: groupName as string,
        token,
      });
      const deployPayload = this.buildDeployPayload(groupInfo, lookupId, lookupVersion);
      deployResult = await this.criblClient.deployLookups({
        baseUrl: criblBaseUrl,
        groupName: groupName as string,
        token,
        payload: deployPayload,
      });
    }

    return {
      success: true,
      operation,
      deployed: shouldDeploy,
      lookupId,
      lookupVersion,
      uploadedTempFile: uploadResult.filename,
      criblResponse: result,
      deployResponse: deployResult,
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

  private extractLookupVersion(criblResponse: unknown): string | null {
    if (typeof criblResponse !== 'object' || criblResponse === null) return null;

    const items = (criblResponse as { items?: unknown }).items;
    if (Array.isArray(items) && items.length > 0) {
      const version = (items[0] as { version?: unknown }).version;
      if (typeof version === 'string' && version.trim().length > 0) return version;
    }

    const directVersion = (criblResponse as { version?: unknown }).version;
    if (typeof directVersion === 'string' && directVersion.trim().length > 0) return directVersion;

    return null;
  }

  private buildDeployPayload(
    groupInfo: GroupInfoResponse,
    lookupId: string,
    lookupVersion: string,
  ): DeployLookupsPayload {
    const group = groupInfo.items?.[0];
    const commit = group?.git?.commit;
    if (!commit) {
      throw new RequestValidationError('Could not determine group commit for deploy.');
    }

    const existing = group.lookupDeployments ?? [];
    const lookupsByContext = existing.map((entry) => ({
      context: entry.context || 'cribl',
      lookups: (entry.lookups ?? [])
        .filter((l) => Boolean(l.file && l.version))
        .map((l) => ({ file: l.file as string, version: l.version as string })),
    }));

    let updated = false;
    for (const ctx of lookupsByContext) {
      const idx = ctx.lookups.findIndex((l) => l.file === lookupId);
      if (idx >= 0) {
        ctx.lookups[idx] = { file: lookupId, version: lookupVersion };
        updated = true;
      }
    }

    if (!updated) {
      const targetCtx = lookupsByContext.find((c) => c.context === 'cribl') ?? lookupsByContext[0];
      if (targetCtx) {
        targetCtx.lookups.push({ file: lookupId, version: lookupVersion });
      } else {
        lookupsByContext.push({
          context: 'cribl',
          lookups: [{ file: lookupId, version: lookupVersion }],
        });
      }
    }

    return {
      version: commit,
      lookups: lookupsByContext,
    };
  }
}
