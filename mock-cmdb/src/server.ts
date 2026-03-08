import express, { Request, Response } from 'express';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const app = express();
const port = Number(process.env.PORT) || 3000;
const endpoint = process.env.ENDPOINT || '/insight/objects';
const dataPath = path.resolve(__dirname, '..', 'data.json');

function loadData() {
  const raw = readFileSync(dataPath, 'utf8');
  return JSON.parse(raw);
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

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    message: `Use GET ${endpoint}`,
  });
});

app.listen(port, () => {
  console.log(`Mock Jira Insight CMDB server listening on http://localhost:${port}${endpoint}`);
});
