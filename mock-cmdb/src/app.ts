import express, { Request, Response } from 'express';

import { AppConfig } from './config';
import { CriblApiError } from './clients/http-cribl-lookups-client';
import { RequestValidationError, LookupUpdateService } from './services/lookup-update-service';
import { CmdbRepository } from './types';

type AppDeps = {
  config: AppConfig;
  repository: CmdbRepository;
  lookupUpdateService: LookupUpdateService;
};

export function createApp(deps: AppDeps) {
  const app = express();
  const { config, repository, lookupUpdateService } = deps;

  app.use(express.json());

  app.get(config.cmdbEndpoint, (_req: Request, res: Response) => {
    try {
      const payload = repository.loadData();
      res.status(200).json(payload);
    } catch (error) {
      const details = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        error: 'Failed to load mock CMDB data',
        details,
      });
    }
  });

  app.post(config.lookupUpdateEndpoint, async (req: Request, res: Response) => {
    try {
      const result = await lookupUpdateService.execute(req.body ?? {});
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof RequestValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      if (error instanceof CriblApiError) {
        res.status(502).json({
          error: error.message,
          status: error.status,
          response: error.responseBody,
        });
        return;
      }
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
      message: `Use GET ${config.cmdbEndpoint} or POST ${config.lookupUpdateEndpoint}`,
    });
  });

  return app;
}
