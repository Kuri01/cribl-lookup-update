import { Injectable } from '@nestjs/common';

import { AppConfig } from '../config/app-config';
import { CmdbPayload } from './cmdb.types';

@Injectable()
export class CmdbRepository {
  constructor(private readonly config: AppConfig) {}

  async loadData(): Promise<CmdbPayload> {
    const response = await fetch(this.config.jiraInsightApiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });
    const body = (await response.json()) as CmdbPayload | { error?: string; details?: string };
    if (!response.ok) {
      const details =
        typeof body === 'object' && body !== null && 'details' in body
          ? String((body as { details?: unknown }).details ?? '')
          : '';
      throw new Error(`mock-jira-insight responded with ${response.status}${details ? `: ${details}` : ''}`);
    }
    return body as CmdbPayload;
  }
}
