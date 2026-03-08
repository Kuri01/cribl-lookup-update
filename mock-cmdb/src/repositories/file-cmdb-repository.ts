import { readFileSync } from 'node:fs';

import { CmdbPayload, CmdbRepository } from '../types';

export class FileCmdbRepository implements CmdbRepository {
  constructor(private readonly dataPath: string) {}

  loadData(): CmdbPayload {
    const raw = readFileSync(this.dataPath, 'utf8');
    return JSON.parse(raw) as CmdbPayload;
  }
}
