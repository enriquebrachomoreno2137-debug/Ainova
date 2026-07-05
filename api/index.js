import { ensureSchema } from '../database.js';
import app from '../server.js';

let schemaInitialized = false;

export default async function handler(req, res) {
  if (!schemaInitialized) {
    try {
      await ensureSchema();
      schemaInitialized = true;
    } catch (e) {
      console.error('Failed to initialize schema:', e);
      res.status(500).json({ error: 'Database schema initialization failed' });
      return;
    }
  }
  return app(req, res);
}
