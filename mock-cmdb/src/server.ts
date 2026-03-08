import express, { Request, Response } from 'express';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const app = express();
const port = Number(process.env.PORT) || 3000;
const endpoint = process.env.ENDPOINT || '/insight/objects';
const dataPath = path.resolve(__dirname, '..', 'data.json');
const lookupUpdateEndpoint = process.env.LOOKUP_UPDATE_ENDPOINT || '/cribl/lookups/update';

type CmdbValue = {
  id?: string;
  globalId?: string;
  label?: string;
  objectKey?: string;
  objectType?: {
    id?: string;
    name?: string;
  };
  timestamp?: string;
  attributes?: Array<{
    objectTypeAttribute?: {
      name?: string;
    };
    objectAttributeValues?: Array<{
      displayValue?: string;
      value?: unknown;
    }>;
  }>;
};

type CmdbPayload = {
  values?: CmdbValue[];
};

type LookupUpdateRequest = {
  criblBaseUrl?: string;
  token?: string;
  groupName?: string;
  lookupId?: string;
  mode?: 'memory' | 'disk';
  dryRun?: boolean;
};

function loadData() {
  const raw = readFileSync(dataPath, 'utf8');
  return JSON.parse(raw) as CmdbPayload;
}

function escapeCsv(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function valueToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function cmdbToCsv(payload: CmdbPayload): string {
  const values = Array.isArray(payload.values) ? payload.values : [];
  const attributeNames = new Set<string>();

  for (const item of values) {
    for (const attribute of item.attributes ?? []) {
      const name = attribute.objectTypeAttribute?.name?.trim();
      if (name) attributeNames.add(name);
    }
  }

  const sortedAttributeNames = Array.from(attributeNames).sort((a, b) => a.localeCompare(b));
  const headers = [
    'id',
    'globalId',
    'label',
    'objectKey',
    'objectTypeId',
    'objectTypeName',
    'timestamp',
    ...sortedAttributeNames,
  ];

  const rows = values.map((item) => {
    const row: Record<string, string> = {
      id: valueToString(item.id),
      globalId: valueToString(item.globalId),
      label: valueToString(item.label),
      objectKey: valueToString(item.objectKey),
      objectTypeId: valueToString(item.objectType?.id),
      objectTypeName: valueToString(item.objectType?.name),
      timestamp: valueToString(item.timestamp),
    };

    for (const attrName of sortedAttributeNames) {
      row[attrName] = '';
    }

    for (const attribute of item.attributes ?? []) {
      const name = attribute.objectTypeAttribute?.name?.trim();
      if (!name) continue;
      const valuesList = attribute.objectAttributeValues ?? [];
      const joined = valuesList
        .map((entry) => valueToString(entry.displayValue ?? entry.value))
        .filter((v) => v.length > 0)
        .join(';');
      row[name] = joined;
    }

    return headers.map((header) => escapeCsv(row[header] ?? '')).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

function buildLookupsPath(baseUrl: string, groupName?: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  if (groupName) {
    return `${normalizedBase}/m/${encodeURIComponent(groupName)}/system/lookups`;
  }
  return `${normalizedBase}/system/lookups`;
}

app.get(endpoint, (_req: Request, res: Response) => {
  try {
    const payload = loadData();
    res.status(200).json(payload);
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Failed to load mock CMDB data',
      details,
    });
  }
});

app.post(lookupUpdateEndpoint, express.json(), async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as LookupUpdateRequest;
    const criblBaseUrl = body.criblBaseUrl ?? process.env.CRIBL_API_BASE_URL;
    const token = body.token ?? process.env.CRIBL_API_TOKEN;
    const groupName = body.groupName ?? process.env.CRIBL_GROUP_NAME;
    const lookupId = body.lookupId ?? process.env.CRIBL_LOOKUP_ID ?? 'jira_cmdb_mock.csv';
    const mode = body.mode ?? (process.env.CRIBL_LOOKUP_MODE as 'memory' | 'disk' | undefined);
    const dryRun = Boolean(body.dryRun);
    const effectiveBaseUrl = criblBaseUrl ?? 'http://leader1:9000/api/v1';

    if (!effectiveBaseUrl) {
      res.status(400).json({ error: 'Missing criblBaseUrl (or CRIBL_API_BASE_URL env).' });
      return;
    }
    if (!token && !dryRun) {
      res.status(400).json({ error: 'Missing token (or CRIBL_API_TOKEN env).' });
      return;
    }

    const payload = loadData();
    const csv = cmdbToCsv(payload);
    const lookupsPath = buildLookupsPath(effectiveBaseUrl, groupName);
    const uploadFileName = lookupId.endsWith('.csv') ? lookupId : `${lookupId}.csv`;
    const uploadUrl = `${lookupsPath}?filename=${encodeURIComponent(uploadFileName)}`;
    const patchUrl = `${lookupsPath}/${encodeURIComponent(uploadFileName)}`;

    if (dryRun) {
      res.status(200).json({
        dryRun: true,
        uploadUrl,
        patchUrl,
        lookupId: uploadFileName,
        rows: Math.max(0, csv.split('\n').length - 1),
        preview: csv.split('\n').slice(0, 3),
      });
      return;
    }

    const authHeaders = {
      Authorization: `Bearer ${token}`,
    };

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        ...authHeaders,
        'Content-Type': 'text/csv',
      },
      body: csv,
    });

    const uploadBody = (await uploadResponse.json()) as { filename?: string; [key: string]: unknown };
    if (!uploadResponse.ok || !uploadBody.filename) {
      res.status(502).json({
        error: 'Failed to upload lookup CSV to Cribl.',
        status: uploadResponse.status,
        response: uploadBody,
      });
      return;
    }

    const patchPayload: {
      id: string;
      fileInfo: { filename: string };
      mode?: 'memory' | 'disk';
    } = {
      id: uploadFileName,
      fileInfo: { filename: uploadBody.filename },
    };
    if (mode) patchPayload.mode = mode;

    const patchResponse = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patchPayload),
    });

    const patchBody = (await patchResponse.json()) as unknown;
    if (!patchResponse.ok) {
      res.status(502).json({
        error: 'Failed to patch existing lookup in Cribl.',
        status: patchResponse.status,
        response: patchBody,
      });
      return;
    }

    res.status(200).json({
      success: true,
      lookupId: uploadFileName,
      uploadedTempFile: uploadBody.filename,
      criblResponse: patchBody,
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Lookup update flow failed',
      details,
    });
  }
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    message: `Use GET ${endpoint} or POST ${lookupUpdateEndpoint}`,
  });
});

app.listen(port, () => {
  console.log(`Mock Jira Insight CMDB server listening on http://localhost:${port}${endpoint}`);
  console.log(`Lookup updater endpoint listening on http://localhost:${port}${lookupUpdateEndpoint}`);
});
