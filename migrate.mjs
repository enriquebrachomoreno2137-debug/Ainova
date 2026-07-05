import { createClient } from "@libsql/client";
import { readFileSync } from "fs";

// Read .env if exists
try {
  const env = readFileSync(".env", "utf-8");
  for (const line of env.split("\n")) {
    const [k, ...v] = line.split("=");
    if (k && v.length) process.env[k.trim()] = v.join("=").trim();
  }
} catch {}

const REMOTE_URL = process.env.TURSO_DATABASE_URL || "libsql://ainova-enriquebrachomoreno2137-debug.aws-us-east-1.turso.io";
const REMOTE_TOKEN = process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODMyODE0MDQsImlkIjoiMDE5ZjMzZGEtMWIwMS03ZjNlLWIzZTAtNDc2YjRlNzhhOGJiIiwia2lkIjoiQkxhUmY3ZGhUcTh4Wi00bXJXZmtXZ0JxM1dmVzhoNERTemhyOEItSnR0USIsInJpZCI6IjBjYzcxNzRmLTVlMWEtNDAxMi1iZGQ2LTYyYTk3NGQ3ZDM5ZCJ9.l_BIdl5oWeeaJwYas6nD3kap5MbdNi1yXuk695R-rqtQofkj82CTW1ZwDe7_B_dgpExgygqnAj38K-QD3y8VCA";

const LOCAL = createClient({ url: "file:data.db" });
const REMOTE = createClient({ url: REMOTE_URL, authToken: REMOTE_TOKEN });

async function migrate() {
  await REMOTE.execute("CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, type TEXT NOT NULL, name TEXT NOT NULL, location TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')))");
  await REMOTE.execute("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL, org_id TEXT NOT NULL, phone TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')))");
  await REMOTE.execute("CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, org_id TEXT NOT NULL, org_type TEXT NOT NULL, org_name TEXT NOT NULL, name TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')))");
  await REMOTE.execute("CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, org_id TEXT NOT NULL, code TEXT DEFAULT '', name TEXT NOT NULL, price REAL NOT NULL, cost REAL DEFAULT 0, category TEXT DEFAULT 'General', min_stock INTEGER DEFAULT 5)");
  await REMOTE.execute("CREATE TABLE IF NOT EXISTS inventory (id TEXT PRIMARY KEY, org_id TEXT NOT NULL, product_id TEXT NOT NULL, warehouse_id TEXT DEFAULT 'wh_main', quantity REAL DEFAULT 0, UNIQUE(org_id, product_id, warehouse_id))");
  await REMOTE.execute("CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, org_id TEXT NOT NULL, customer_name TEXT DEFAULT '', items TEXT NOT NULL, total_usd REAL NOT NULL, total_bs REAL NOT NULL, vendor TEXT DEFAULT '', warehouse_id TEXT DEFAULT 'wh_main', is_direct INTEGER DEFAULT 1, checkout_time TEXT DEFAULT (datetime('now')))");
  await REMOTE.execute("CREATE TABLE IF NOT EXISTS movements (id TEXT PRIMARY KEY, org_id TEXT NOT NULL, type TEXT NOT NULL, product_id TEXT NOT NULL, warehouse_id TEXT DEFAULT 'wh_main', qty REAL NOT NULL, cost REAL DEFAULT 0, reference TEXT DEFAULT '', vendor TEXT DEFAULT '', date TEXT DEFAULT (datetime('now')))");
  console.log("Schema created");

  const orgs = (await LOCAL.execute("SELECT * FROM organizations")).rows;
  for (const o of orgs) {
    await REMOTE.execute("INSERT OR REPLACE INTO organizations (id, type, name, location, created_at) VALUES (?, ?, ?, ?, ?)", [o.id, o.type, o.name, o.location, o.created_at]);
  }
  console.log(`Orgs: ${orgs.length}`);

  const users = (await LOCAL.execute("SELECT * FROM users")).rows;
  for (const u of users) {
    await REMOTE.execute("INSERT OR REPLACE INTO users (id, username, password, name, org_id, phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [u.id, u.username, u.password, u.name, u.org_id, u.phone, u.created_at]);
  }
  console.log(`Users: ${users.length}`);

  const prods = (await LOCAL.execute("SELECT * FROM products")).rows;
  for (const p of prods) {
    await REMOTE.execute("INSERT OR REPLACE INTO products (id, org_id, code, name, price, cost, category, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [p.id, p.org_id, p.code, p.name, p.price, p.cost, p.category, p.min_stock]);
  }
  console.log(`Products: ${prods.length}`);

  const inv = (await LOCAL.execute("SELECT * FROM inventory")).rows;
  for (const i of inv) {
    await REMOTE.execute("INSERT OR REPLACE INTO inventory (id, org_id, product_id, warehouse_id, quantity) VALUES (?, ?, ?, ?, ?)", [i.id, i.org_id, i.product_id, i.warehouse_id, i.quantity]);
  }
  console.log(`Inventory: ${inv.length}`);

  const sales = (await LOCAL.execute("SELECT * FROM sales")).rows;
  for (const s of sales) {
    await REMOTE.execute("INSERT OR REPLACE INTO sales (id, org_id, customer_name, items, total_usd, total_bs, vendor, warehouse_id, is_direct, checkout_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [s.id, s.org_id, s.customer_name, s.items, s.total_usd, s.total_bs, s.vendor, s.warehouse_id, s.is_direct, s.checkout_time]);
  }
  console.log(`Sales: ${sales.length}`);

  const movs = (await LOCAL.execute("SELECT * FROM movements")).rows;
  for (const m of movs) {
    await REMOTE.execute("INSERT OR REPLACE INTO movements (id, org_id, type, product_id, warehouse_id, qty, cost, reference, vendor, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [m.id, m.org_id, m.type, m.product_id, m.warehouse_id, m.qty, m.cost, m.reference, m.vendor, m.date]);
  }
  console.log(`Movements: ${movs.length}`);

  console.log("Migration complete!");
}

migrate().catch(e => { console.error("Migration failed:", e); process.exit(1); });
