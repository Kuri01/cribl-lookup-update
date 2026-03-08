import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';

import { CriblApiError } from '../cribl/cribl-lookups.client';
import { LookupUpdateService, RequestValidationError } from '../lookup/lookup-update.service';
import { CmdbRepository } from './cmdb.repository';
import { LookupUpdateRequest } from './cmdb.types';

@Controller()
export class CmdbController {
  constructor(
    private readonly repository: CmdbRepository,
    private readonly lookupUpdateService: LookupUpdateService,
  ) {}

  @Get('insight/objects')
  async getCmdbData() {
    try {
      return await this.repository.loadData();
    } catch (error) {
      const details = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        {
          error: 'Failed to load mock CMDB data',
          details,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('cribl/lookups/update')
  @HttpCode(200)
  async updateLookup(@Body() body: Record<string, unknown>) {
    try {
      return await this.lookupUpdateService.execute((body ?? {}) as LookupUpdateRequest);
    } catch (error) {
      if (error instanceof RequestValidationError) {
        throw new HttpException({ error: error.message }, HttpStatus.BAD_REQUEST);
      }
      if (error instanceof CriblApiError) {
        throw new HttpException(
          {
            error: error.message,
            status: error.status,
            response: error.responseBody,
          },
          HttpStatus.BAD_GATEWAY,
        );
      }

      const details = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        {
          error: 'Lookup update flow failed',
          details,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
