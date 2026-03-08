import { Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';

import { AppConfig } from '../config/app-config';
import { CmdbPayload } from './cmdb.types';

@Injectable()
export class CmdbRepository {
  constructor(private readonly config: AppConfig) {}

  loadData(): CmdbPayload {
    const raw = readFileSync(this.config.dataPath, 'utf8');
    return JSON.parse(raw) as CmdbPayload;
  }
}
