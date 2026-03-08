import { LookupMode, LookupUpdateRequest, CmdbCsvSerializer, CmdbRepository, CriblLookupsClient } from '../types';

export type LookupUpdateDefaults = {
  criblBaseUrl: string;
  groupName?: string;
  lookupId: string;
  mode?: LookupMode;
  token?: string;
};

export class RequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RequestValidationError';
  }
}

export class LookupUpdateService {
  constructor(
    private readonly repository: CmdbRepository,
    private readonly serializer: CmdbCsvSerializer,
    private readonly criblClient: CriblLookupsClient,
    private readonly defaults: LookupUpdateDefaults
  ) {}

  async execute(request: LookupUpdateRequest): Promise<unknown> {
    const dryRun = Boolean(request.dryRun);
    const criblBaseUrl = request.criblBaseUrl ?? this.defaults.criblBaseUrl;
    const token = request.token ?? this.defaults.token;
    const groupName = request.groupName ?? this.defaults.groupName;
    const mode = request.mode ?? this.defaults.mode;
    const lookupIdRaw = request.lookupId ?? this.defaults.lookupId;
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
