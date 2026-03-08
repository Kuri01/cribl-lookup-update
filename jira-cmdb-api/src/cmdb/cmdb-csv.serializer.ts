import { Injectable } from '@nestjs/common';

import { CmdbPayload } from './cmdb.types';

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

@Injectable()
export class CmdbCsvSerializer {
  serialize(payload: CmdbPayload): string {
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
}
