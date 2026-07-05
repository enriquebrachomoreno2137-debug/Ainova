import { createClient } from "@libsql/client";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, 'data.db');

let db;
let schemaReady = false;

function getDbUrl() {
  return process.env.TURSO_DATABASE_URL || `file:${DB_PATH}`;
}

function getDbAuthToken() {
  return process.env.TURSO_AUTH_TOKEN || '';
}

export function getDb() {
  if (!db) {
    const url = getDbUrl();
    const authToken = getDbAuthToken();
    db = createClient({
      url,
      ...(authToken ? { authToken } : {}),
    });
  }
  return db;
}

export async function ensureSchema() {
  if (schemaReady) return;
  const d = getDb();
  await d.execute(`CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, type TEXT NOT NULL CHECK(type IN ('business', 'collection-center')), name TEXT NOT NULL, location TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')))`);
  await d.execute(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL, org_id TEXT NOT NULL, phone TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (org_id) REFERENCES organizations(id))`);
  await d.execute(`CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, org_id TEXT NOT NULL, org_type TEXT NOT NULL, org_name TEXT NOT NULL, name TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id))`);
  await d.execute(`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, org_id TEXT NOT NULL, code TEXT DEFAULT '', name TEXT NOT NULL, price REAL NOT NULL, cost REAL DEFAULT 0, category TEXT DEFAULT 'General', min_stock INTEGER DEFAULT 5, FOREIGN KEY (org_id) REFERENCES organizations(id))`);
  await d.execute(`CREATE TABLE IF NOT EXISTS inventory (id TEXT PRIMARY KEY, org_id TEXT NOT NULL, product_id TEXT NOT NULL, warehouse_id TEXT DEFAULT 'wh_main', quantity REAL DEFAULT 0, FOREIGN KEY (org_id) REFERENCES organizations(id), FOREIGN KEY (product_id) REFERENCES products(id), UNIQUE(org_id, product_id, warehouse_id))`);
  await d.execute(`CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, org_id TEXT NOT NULL, customer_name TEXT DEFAULT '', items TEXT NOT NULL, total_usd REAL NOT NULL, total_bs REAL NOT NULL, vendor TEXT DEFAULT '', warehouse_id TEXT DEFAULT 'wh_main', is_direct INTEGER DEFAULT 1, checkout_time TEXT DEFAULT (datetime('now')), FOREIGN KEY (org_id) REFERENCES organizations(id))`);
  await d.execute(`CREATE TABLE IF NOT EXISTS movements (id TEXT PRIMARY KEY, org_id TEXT NOT NULL, type TEXT NOT NULL, product_id TEXT NOT NULL, warehouse_id TEXT DEFAULT 'wh_main', qty REAL NOT NULL, cost REAL DEFAULT 0, reference TEXT DEFAULT '', vendor TEXT DEFAULT '', date TEXT DEFAULT (datetime('now')), FOREIGN KEY (org_id) REFERENCES organizations(id))`);
  schemaReady = true;
}

export function closeDb() {
  if (db) {
    db = null;
    schemaReady = false;
  }
}
