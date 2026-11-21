import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 8787);
const dataDir = path.resolve(root, process.env.DATA_DIR || './data');
const dataFile = path.join(dataDir, 'items.json');
fs.mkdirSync(dataDir, { recursive: true });

app.use(express.static(root));
app.get('/api/items', (_req, res) => {
  try {
    const items = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : [];
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: '无法读取数据' });
  }
});
app.listen(port, () => console.log(`Dajia reader listening on :${port}`));
