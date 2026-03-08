import { Injectable } from '@nestjs/common';

import { LookupMode } from '../config/app-config';
import { UploadLookupResponse } from '../cmdb/cmdb.types';

function buildLookupsPath(baseUrl: string, groupName?: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  if (groupName) {
    return `${normalizedBase}/m/${encodeURIComponent(groupName)}/system/lookups`;
  }
  return `${normalizedBase}/system/lookups`;
}

function buildAuthPath(baseUrl: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '').replace(/\/m\/[^/]+$/, '');
  return `${normalizedBase}/auth/login`;
}

function baseWithoutManagedGroup(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '').replace(/\/m\/[^/]+$/, '');
}

function buildGroupInfoPath(baseUrl: string, groupName: string): string {
  const base = baseWithoutManagedGroup(baseUrl);
  const params = new URLSearchParams({
    fields: 'git.log,git.commit,git.localChanges,lookups',
  });
  return `${base}/master/groups/${encodeURIComponent(groupName)}?${params.toString()}`;
}

function buildGroupDeployPath(baseUrl: string, groupName: string): string {
  const base = baseWithoutManagedGroup(baseUrl);
  return `${base}/master/groups/${encodeURIComponent(groupName)}/deploy`;
}

function normalizeToken(token: string): string {
  return token.replace(/^Bearer\s+/i, '').trim();
}

export class CriblApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly responseBody: unknown,
  ) {
    super(message);
    this.name = 'CriblApiError';
  }
}

export type GroupInfoResponse = {
  items?: Array<{
    git?: { commit?: string };
    lookupDeployments?: Array<{
      context?: string;
      lookups?: Array<{ file?: string; version?: string }>;
    }>;
  }>;
};

export type DeployLookupsPayload = {
  version: string;
  lookups: Array<{
    context: string;
    lookups: Array<{
      file: string;
      version: string;
    }>;
  }>;
};

@Injectable()
export class CriblLookupsClient {
  async login(input: { baseUrl: string; username: string; password: string }): Promise<string> {
    const authUrl = buildAuthPath(input.baseUrl);
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: input.username,
        password: input.password,
      }),
    });

    const body = (await response.json()) as { token?: string; accessToken?: string; jwt?: string };
    const token = body.token ?? body.accessToken ?? body.jwt;
    if (!response.ok || !token) {
      throw new CriblApiError('Failed to authenticate against Cribl API.', response.status, body);
    }

    return normalizeToken(token);
  }

  async uploadLookupCsv(input: {
    baseUrl: string;
    groupName?: string;
    token: string;
    fileName: string;
    csvContent: string;
  }): Promise<UploadLookupResponse> {
    const lookupsPath = buildLookupsPath(input.baseUrl, input.groupName);
    const uploadUrl = `${lookupsPath}?filename=${encodeURIComponent(input.fileName)}`;
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${normalizeToken(input.token)}`,
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

    const response = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${normalizeToken(input.token)}`,
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

  async createLookup(input: {
    baseUrl: string;
    groupName?: string;
    token: string;
    lookupId: string;
    uploadedTempFilename: string;
    mode?: LookupMode;
  }): Promise<unknown> {
    const lookupsPath = buildLookupsPath(input.baseUrl, input.groupName);
    const payload: {
      id: string;
      fileInfo: { filename: string };
      mode?: LookupMode;
    } = {
      id: input.lookupId,
      fileInfo: { filename: input.uploadedTempFilename },
    };

    if (input.mode) payload.mode = input.mode;

    const response = await fetch(lookupsPath, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${normalizeToken(input.token)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const body = (await response.json()) as unknown;
    if (!response.ok) {
      throw new CriblApiError('Failed to create lookup in Cribl.', response.status, body);
    }

    return body;
  }

  async getGroupInfo(input: {
    baseUrl: string;
    groupName: string;
    token: string;
  }): Promise<GroupInfoResponse> {
    const url = buildGroupInfoPath(input.baseUrl, input.groupName);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${normalizeToken(input.token)}`,
        'Content-Type': 'application/json',
      },
    });

    const body = (await response.json()) as GroupInfoResponse;
    if (!response.ok) {
      throw new CriblApiError('Failed to fetch group info from Cribl.', response.status, body);
    }
    return body;
  }

  async deployLookups(input: {
    baseUrl: string;
    groupName: string;
    token: string;
    payload: DeployLookupsPayload;
  }): Promise<unknown> {
    const url = buildGroupDeployPath(input.baseUrl, input.groupName);
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${normalizeToken(input.token)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input.payload),
    });
    const body = (await response.json()) as unknown;
    if (!response.ok) {
      throw new CriblApiError('Failed to deploy lookup changes to Cribl workers.', response.status, body);
    }
    return body;
  }
}
