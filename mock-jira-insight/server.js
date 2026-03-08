const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT) || 3000;
const ENDPOINT = process.env.ENDPOINT || '/insight/objects';
const DATA_PATH = path.join(__dirname, 'data.json');

function loadData() {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === ENDPOINT) {
    try {
      const payload = loadData();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(payload));
      return;
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          error: 'Failed to load mock Jira Insight data',
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(
    JSON.stringify({
      error: 'Not found',
      message: `Use GET ${ENDPOINT}`,
    }),
  );
});

server.listen(PORT, () => {
  console.log(`mock-jira-insight listening on http://localhost:${PORT}${ENDPOINT}`);
});
