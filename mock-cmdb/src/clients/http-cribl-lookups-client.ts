import { CriblLookupsClient, LookupMode, UploadLookupResponse } from '../types';

type HttpClient = typeof fetch;

function buildLookupsPath(baseUrl: string, groupName?: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  if (groupName) {
    return `${normalizedBase}/m/${encodeURIComponent(groupName)}/system/lookups`;
  }
  return `${normalizedBase}/system/lookups`;
}

export class CriblApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly responseBody: unknown
  ) {
    super(message);
    this.name = 'CriblApiError';
  }
}

export class HttpCriblLookupsClient implements CriblLookupsClient {
  constructor(private readonly httpClient: HttpClient = fetch) {}

  async uploadLookupCsv(input: {
    baseUrl: string;
    groupName?: string;
    token: string;
    fileName: string;
    csvContent: string;
  }): Promise<UploadLookupResponse> {
    const lookupsPath = buildLookupsPath(input.baseUrl, input.groupName);
    const uploadUrl = `${lookupsPath}?filename=${encodeURIComponent(input.fileName)}`;
    const response = await this.httpClient(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${input.token}`,
        'Content-Type': 'text/csv',
      },
      body: input.csvContent,
    });
    const body = (await response.json()) as UploadLookupResponse;
    if (!response.ok || !body.filename) {
      throw new CriblApiError('Failed to upload lookup CSV to Cribl.', response.status, body);
    }
    return body;
  }

  async replaceLookup(input: {
    baseUrl: string;
    groupName?: string;
    token: string;
    lookupId: string;
    uploadedTempFilename: string;
    mode?: LookupMode;
  }): Promise<unknown> {
    const lookupsPath = buildLookupsPath(input.baseUrl, input.groupName);
    const patchUrl = `${lookupsPath}/${encodeURIComponent(input.lookupId)}`;
    const payload: {
      id: string;
      fileInfo: { filename: string };
      mode?: LookupMode;
    } = {
      id: input.lookupId,
      fileInfo: { filename: input.uploadedTempFilename },
    };
    if (input.mode) payload.mode = input.mode;

    const response = await this.httpClient(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${input.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const body = (await response.json()) as unknown;
    if (!response.ok) {
      throw new CriblApiError('Failed to patch existing lookup in Cribl.', response.status, body);
    }
    return body;
  }
}
