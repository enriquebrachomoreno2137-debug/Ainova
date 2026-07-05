import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './database.js';

function toId(str) {
  return str.toLowerCase()
    .replace(/[áä]/g, 'a').replace(/[éë]/g, 'e').replace(/[íï]/g, 'i')
    .replace(/[óö]/g, 'o').replace(/[úü]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve built frontend in production
const distPath = join(__dirname, 'dist');
app.use(express.static(distPath));

// ─── Auth Routes ───────────────────────────────────────────────

app.post('/api/register', (req, res) => {
  const { username, password, name, orgType, orgName, location } = req.body;
  if (!username || !password || !name || !orgType || !orgName) {
    return res.status(400).json({ error: 'Todos los campos requeridos' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'Contraseña debe tener al menos 4 caracteres' });
  }

  const db = getDb();

  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existingUser) {
    return res.status(400).json({ error: 'Este usuario ya existe' });
  }

  const orgId = toId(orgName);
  const userId = uuidv4();
  const token = uuidv4();

  const createOrg = db.prepare('INSERT INTO organizations (id, type, name, location) VALUES (?, ?, ?, ?)');
  const createUser = db.prepare('INSERT INTO users (id, username, password, name, org_id, phone) VALUES (?, ?, ?, ?, ?, ?)');
  const createSession = db.prepare('INSERT INTO sessions (token, user_id, org_id, org_type, org_name, name) VALUES (?, ?, ?, ?, ?, ?)');

  const transaction = db.transaction(() => {
    createOrg.run(orgId, orgType, orgName, location || '');
    createUser.run(userId, username, password, name, orgId, '');
    createSession.run(token, userId, orgId, orgType, orgName, name);
  });

  transaction();

  res.json({
    success: true,
    session: { token, userId, username, name, orgType, orgId, orgName },
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  const db = getDb();
  const user = db.prepare(`
    SELECT u.id, u.username, u.name, u.org_id, u.phone, o.type as org_type, o.name as org_name
    FROM users u
    JOIN organizations o ON u.org_id = o.id
    WHERE u.username = ? AND u.password = ?
  `).get(username, password);

  if (!user) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  const token = uuidv4();
  db.prepare('INSERT INTO sessions (token, user_id, org_id, org_type, org_name, name) VALUES (?, ?, ?, ?, ?, ?)')
    .run(token, user.id, user.org_id, user.org_type, user.org_name, user.name);

  res.json({
    success: true,
    session: {
      token,
      userId: user.id,
      username: user.username,
      name: user.name,
      orgType: user.org_type,
      orgId: user.org_id,
      orgName: user.org_name,
    },
  });
});

app.post('/api/verify-session', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(401).json({ valid: false });

  const db = getDb();
  const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
  if (!session) return res.status(401).json({ valid: false });

  res.json({
    valid: true,
    session: {
      token: session.token,
      userId: session.user_id,
      name: session.name,
      orgType: session.org_type,
      orgId: session.org_id,
      orgName: session.org_name,
    },
  });
});

// ─── Auth Middleware ───────────────────────────────────────────

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  const token = authHeader.slice(7);
  const db = getDb();
  const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
  if (!session) {
    return res.status(401).json({ error: 'Sesión inválida' });
  }
  req.session = session;
  next();
}

// ─── Products Routes ──────────────────────────────────────────

app.get('/api/products', authMiddleware, (req, res) => {
  const db = getDb();
  const products = db.prepare('SELECT * FROM products WHERE org_id = ? ORDER BY name').all(req.session.org_id);
  res.json(products);
});

app.post('/api/products', authMiddleware, (req, res) => {
  const { name, price, cost, code, category, minStock } = req.body;
  if (!name || price === undefined || parseFloat(price) <= 0) {
    return res.status(400).json({ error: 'Nombre y precio válido requeridos' });
  }
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO products (id, org_id, code, name, price, cost, category, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.session.org_id, code || '', name, parseFloat(price), parseFloat(cost) || 0, category || 'General', parseInt(minStock) || 5);
  res.json({ success: true, id });
});

app.put('/api/products/:id', authMiddleware, (req, res) => {
  const { name, price, cost, code, category, minStock } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM products WHERE id = ? AND org_id = ?').get(req.params.id, req.session.org_id);
  if (!existing) return res.status(404).json({ error: 'Producto no encontrado' });

  db.prepare('UPDATE products SET name=?, price=?, cost=?, code=?, category=?, min_stock=? WHERE id=?')
    .run(name, parseFloat(price), parseFloat(cost) || 0, code || '', category, parseInt(minStock) || 5, req.params.id);
  res.json({ success: true });
});

app.delete('/api/products/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM products WHERE id = ? AND org_id = ?').get(req.params.id, req.session.org_id);
  if (!existing) return res.status(404).json({ error: 'Producto no encontrado' });

  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Seed (default data for new orgs) ─────────────────────────

app.post('/api/seed', authMiddleware, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT COUNT(*) as count FROM products WHERE org_id = ?').get(req.session.org_id);
  if (existing.count > 0) return res.json({ seeded: false, message: 'Ya tiene productos' });

  const PRODUCTS = [
    { code:'001', name:'ARROZ 1KG', price:1.50, cost:0, category:'Comestibles', min_stock:5 },
    { code:'002', name:'PASTA 500G', price:0.80, cost:0, category:'Comestibles', min_stock:5 },
    { code:'003', name:'HARINA 1KG', price:1.20, cost:0, category:'Comestibles', min_stock:5 },
    { code:'004', name:'AZUCAR 1KG', price:1.10, cost:0, category:'Comestibles', min_stock:5 },
    { code:'005', name:'SAL 500G', price:0.50, cost:0, category:'Comestibles', min_stock:5 },
    { code:'006', name:'ACEITE 1L', price:2.00, cost:0, category:'Comestibles', min_stock:5 },
    { code:'007', name:'MANTEQUILLA', price:2.50, cost:0, category:'Comestibles', min_stock:5 },
    { code:'008', name:'LECHE 1L', price:1.00, cost:0, category:'Comestibles', min_stock:5 },
    { code:'009', name:'HUEVOS 12U', price:1.80, cost:0, category:'Comestibles', min_stock:5 },
    { code:'010', name:'PAN BLANCO', price:0.90, cost:0, category:'Comestibles', min_stock:5 },
    { code:'011', name:'JABON LAVA', price:1.50, cost:0, category:'General', min_stock:5 },
    { code:'012', name:'DETERGENTE', price:1.20, cost:0, category:'General', min_stock:5 },
    { code:'013', name:'CLORO 1L', price:0.80, cost:0, category:'General', min_stock:5 },
    { code:'014', name:'ESPONJA', price:0.50, cost:0, category:'General', min_stock:5 },
    { code:'015', name:'BOLSAS GRANDES', price:1.00, cost:0, category:'General', min_stock:5 },
    { code:'016', name:'BOLSAS CHICAS', price:0.50, cost:0, category:'General', min_stock:5 },
    { code:'017', name:'SERVILLETAS', price:0.60, cost:0, category:'General', min_stock:5 },
    { code:'018', name:'PAPEL HIGIENICO', price:1.20, cost:0, category:'General', min_stock:5 },
    { code:'019', name:'COCA COLA 2L', price:2.50, cost:0, category:'Bebidas', min_stock:5 },
    { code:'020', name:'PEPSI 2L', price:2.50, cost:0, category:'Bebidas', min_stock:5 },
    { code:'021', name:'AQUARIUS 1L', price:1.50, cost:0, category:'Bebidas', min_stock:5 },
    { code:'022', name:'JUGO DEL VALLE', price:1.20, cost:0, category:'Bebidas', min_stock:5 },
    { code:'023', name:'AGUA 1.5L', price:0.80, cost:0, category:'Bebidas', min_stock:5 },
    { code:'024', name:'MALTA 350ML', price:0.90, cost:0, category:'Bebidas', min_stock:5 },
    { code:'025', name:'CERVEZA 350ML', price:1.00, cost:0, category:'Bebidas', min_stock:5 },
    { code:'026', name:'CAFECITO', price:0.50, cost:0, category:'Bebidas', min_stock:5 },
  ];

  const insert = db.prepare('INSERT INTO products (id, org_id, code, name, price, cost, category, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const tx = db.transaction(() => {
    for (const p of PRODUCTS) {
      insert.run(uuidv4(), req.session.org_id, p.code, p.name, p.price, p.cost, p.category, p.min_stock);
    }
  });
  tx();
  res.json({ seeded: true, count: PRODUCTS.length });
});

// ─── Inventory Routes ────────────────────────────────────────

app.get('/api/inventory', authMiddleware, (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM inventory WHERE org_id = ?').all(req.session.org_id);
  const map = {};
  for (const r of rows) {
    map[`${r.product_id}_${r.warehouse_id}`] = r.quantity;
  }
  res.json(map);
});

app.post('/api/inventory', authMiddleware, (req, res) => {
  const db = getDb();
  const { product_id, warehouse_id, quantity } = req.body;
  if (!product_id) return res.status(400).json({ error: 'product_id requerido' });
  const wh = warehouse_id || 'wh_main';
  const qty = parseFloat(quantity) || 0;
  const existing = db.prepare('SELECT * FROM inventory WHERE org_id = ? AND product_id = ? AND warehouse_id = ?')
    .get(req.session.org_id, product_id, wh);
  if (existing) {
    db.prepare('UPDATE inventory SET quantity = ? WHERE id = ?').run(qty, existing.id);
  } else {
    const id = uuidv4();
    db.prepare('INSERT INTO inventory (id, org_id, product_id, warehouse_id, quantity) VALUES (?, ?, ?, ?, ?)')
      .run(id, req.session.org_id, product_id, wh, qty);
  }
  res.json({ success: true });
});

app.post('/api/inventory/sync', authMiddleware, (req, res) => {
  const db = getDb();
  const { inventory } = req.body;
  if (!inventory) return res.status(400).json({ error: 'inventory requerido' });
  const upsert = db.prepare('INSERT INTO inventory (id, org_id, product_id, warehouse_id, quantity) VALUES (?, ?, ?, ?, ?) ON CONFLICT(org_id, product_id, warehouse_id) DO UPDATE SET quantity = excluded.quantity');
  for (const [key, qty] of Object.entries(inventory)) {
    const parts = key.split('_');
    const wh = parts.slice(1).join('_') || 'wh_main';
    upsert.run(uuidv4(), req.session.org_id, parts[0], wh, qty);
  }
  res.json({ success: true });
});

app.post('/api/inventory/entry', authMiddleware, (req, res) => {
  const db = getDb();
  const { product_id, warehouse_id, quantity, cost } = req.body;
  if (!product_id || !quantity) return res.status(400).json({ error: 'product_id y quantity requeridos' });
  const wh = warehouse_id || 'wh_main';
  const qty = parseFloat(quantity);
  const existing = db.prepare('SELECT * FROM inventory WHERE org_id = ? AND product_id = ? AND warehouse_id = ?')
    .get(req.session.org_id, product_id, wh);
  if (existing) {
    db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE id = ?').run(qty, existing.id);
  } else {
    const id = uuidv4();
    db.prepare('INSERT INTO inventory (id, org_id, product_id, warehouse_id, quantity) VALUES (?, ?, ?, ?, ?)')
      .run(id, req.session.org_id, product_id, wh, qty);
  }
  const movId = uuidv4();
  db.prepare('INSERT INTO movements (id, org_id, type, product_id, warehouse_id, qty, cost, reference, vendor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(movId, req.session.org_id, 'entrada', product_id, wh, qty, parseFloat(cost) || 0, 'Entrada manual', req.session.name);
  res.json({ success: true });
});

// ─── Sales Routes ────────────────────────────────────────────

app.get('/api/sales', authMiddleware, (req, res) => {
  const db = getDb();
  const sales = db.prepare('SELECT * FROM sales WHERE org_id = ? ORDER BY checkout_time DESC').all(req.session.org_id);
  res.json(sales.map(s => ({ ...s, items: JSON.parse(s.items) })));
});

app.post('/api/sales', authMiddleware, (req, res) => {
  const { customer_name, items, total_usd, total_bs, warehouse_id, is_direct } = req.body;
  if (!items) return res.status(400).json({ error: 'items requerido' });
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO sales (id, org_id, customer_name, items, total_usd, total_bs, vendor, warehouse_id, is_direct, checkout_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.session.org_id, customer_name || 'Venta Directa', JSON.stringify(items), parseFloat(total_usd) || 0, parseFloat(total_bs) || 0, req.session.name, warehouse_id || 'wh_main', is_direct ? 1 : 0, new Date().toISOString());
  res.json({ success: true, id });
});

// ─── Movements Routes ────────────────────────────────────────

app.get('/api/movements', authMiddleware, (req, res) => {
  const db = getDb();
  const movs = db.prepare('SELECT * FROM movements WHERE org_id = ? ORDER BY date DESC LIMIT 200').all(req.session.org_id);
  res.json(movs);
});

// ─── Seed Test Data ──────────────────────────────────────────

app.post('/api/seed-test-data', authMiddleware, (req, res) => {
  const db = getDb();

  // Replace ferremar products with hardware items
  const FERREMAR = [
    { code:'F001', name:'Martillo 500g', price:8.00, cost:0, category:'Herramientas', min_stock:5 },
    { code:'F002', name:'Destornillador Plano', price:3.50, cost:0, category:'Herramientas', min_stock:5 },
    { code:'F003', name:'Destornillador Estrella', price:3.50, cost:0, category:'Herramientas', min_stock:5 },
    { code:'F004', name:'Llave Inglesa 12"', price:15.00, cost:0, category:'Herramientas', min_stock:3 },
    { code:'F005', name:'Alicate Universal', price:7.00, cost:0, category:'Herramientas', min_stock:5 },
    { code:'F006', name:'Cinta Métrica 5m', price:5.00, cost:0, category:'Herramientas', min_stock:5 },
    { code:'F007', name:'Nivel 60cm', price:10.00, cost:0, category:'Herramientas', min_stock:3 },
    { code:'F008', name:'Sierra Manual', price:12.00, cost:0, category:'Herramientas', min_stock:3 },
    { code:'F009', name:'Taladro Eléctrico', price:45.00, cost:0, category:'Herramientas Eléctricas', min_stock:2 },
    { code:'F010', name:'Amoladora Angular', price:38.00, cost:0, category:'Herramientas Eléctricas', min_stock:2 },
    { code:'F011', name:'Cable Eléctrico #12 (m)', price:1.50, cost:0, category:'Electricidad', min_stock:10 },
    { code:'F012', name:'Interruptor Simple', price:2.00, cost:0, category:'Electricidad', min_stock:10 },
    { code:'F013', name:'Toma Corriente', price:2.50, cost:0, category:'Electricidad', min_stock:10 },
    { code:'F014', name:'Cinta Aislante', price:1.50, cost:0, category:'Electricidad', min_stock:10 },
    { code:'F015', name:'Bombillo LED 9W', price:3.00, cost:0, category:'Electricidad', min_stock:10 },
    { code:'F016', name:'Tubo PVC 1/2" (m)', price:2.00, cost:0, category:'Plomería', min_stock:5 },
    { code:'F017', name:'Codo PVC 1/2"', price:0.80, cost:0, category:'Plomería', min_stock:10 },
    { code:'F018', name:'Válvula Agua', price:5.00, cost:0, category:'Plomería', min_stock:5 },
    { code:'F019', name:'Grifo Cocina', price:18.00, cost:0, category:'Plomería', min_stock:3 },
    { code:'F020', name:'Pintura Blanca 1L', price:8.00, cost:0, category:'Pintura', min_stock:5 },
    { code:'F021', name:'Brocha 2"', price:3.00, cost:0, category:'Pintura', min_stock:5 },
    { code:'F022', name:'Rodillo 9"', price:4.50, cost:0, category:'Pintura', min_stock:5 },
    { code:'F023', name:'Diluyente 1L', price:4.00, cost:0, category:'Pintura', min_stock:5 },
    { code:'F024', name:'Candado Reforzado', price:6.00, cost:0, category:'Seguridad', min_stock:5 },
    { code:'F025', name:'Cadena 1m', price:5.00, cost:0, category:'Seguridad', min_stock:5 },
    { code:'F026', name:'Cerradura Puerta', price:15.00, cost:0, category:'Seguridad', min_stock:3 },
  ];

  // Delete old products for ferremar
  db.prepare('DELETE FROM products WHERE org_id = ?').run('ferremar');
  const insProd = db.prepare('INSERT INTO products (id, org_id, code, name, price, cost, category, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  for (const p of FERREMAR) {
    insProd.run(uuidv4(), 'ferremar', p.code, p.name, p.price, p.cost, p.category, p.min_stock);
  }

  // Fetch all products per org for inventory seeding
  const allProds = db.prepare('SELECT id, org_id, name FROM products').all();

  // Helper to get products for an org
  const prodsFor = (orgId) => allProds.filter(p => p.org_id === orgId);

  // Seed inventory + sales for each org
  const seedData = {
    pasteleria_ainova: {
      stock: { qty: [50, 30, 40, 25, 35, 20, 15, 30, 20, 25, 10, 15, 20, 10, 12, 18, 25, 8, 15, 10, 5, 20, 8, 12, 10, 15] },
      sales: [
        { customer: 'Cliente 1', items: [{ name: 'ARROZ 1KG', qty: 2, price: 1.50 }, { name: 'ACEITE 1L', qty: 1, price: 2.00 }] },
        { customer: 'Cliente 2', items: [{ name: 'LECHE 1L', qty: 3, price: 1.00 }, { name: 'PAN BLANCO', qty: 2, price: 0.90 }, { name: 'HUEVOS 12U', qty: 1, price: 1.80 }] },
        { customer: 'Cliente 3', items: [{ name: 'COCA COLA 2L', qty: 2, price: 2.50 }, { name: 'JABON LAVA', qty: 1, price: 1.50 }] },
      ],
    },
    ferremar: {
      stock: { qty: [15, 20, 20, 8, 12, 15, 10, 6, 4, 3, 50, 30, 25, 30, 20, 20, 40, 10, 5, 12, 15, 10, 8, 10, 8, 5] },
      sales: [
        { customer: 'Obra Edif. Central', items: [{ name: 'Martillo 500g', qty: 3, price: 8.00 }, { name: 'Cinta Métrica 5m', qty: 2, price: 5.00 }, { name: 'Cable Eléctrico #12 (m)', qty: 20, price: 1.50 }] },
        { customer: 'Taller Mecánico López', items: [{ name: 'Llave Inglesa 12"', qty: 1, price: 15.00 }, { name: 'Alicate Universal', qty: 2, price: 7.00 }, { name: 'Taladro Eléctrico', qty: 1, price: 45.00 }] },
        { customer: 'Casa Pérez', items: [{ name: 'Pintura Blanca 1L', qty: 3, price: 8.00 }, { name: 'Brocha 2"', qty: 2, price: 3.00 }, { name: 'Rodillo 9"', qty: 1, price: 4.50 }] },
      ],
    },
    ropashet: {
      stock: { qty: [30, 20, 15, 18, 12, 10, 10, 8, 5, 15, 12, 10, 50, 15, 10, 8, 6, 5, 8, 10, 5, 10, 40, 30, 12, 15] },
      sales: [
        { customer: 'Sra. María', items: [{ name: 'Vestido Verano', qty: 2, price: 22.00 }, { name: 'Cartera Pequeña', qty: 1, price: 15.00 }] },
        { customer: 'Joven Carlos', items: [{ name: 'Camiseta Básica', qty: 3, price: 8.50 }, { name: 'Short Deportivo', qty: 2, price: 12.00 }, { name: 'Zapatos Deportivos', qty: 1, price: 35.00 }] },
        { customer: 'Directo', items: [{ name: 'Pantalón Jean', qty: 1, price: 25.00 }, { name: 'Cinturón Cuero', qty: 1, price: 12.00 }, { name: 'Camisa Manga Larga', qty: 1, price: 15.00 }] },
      ],
    },
  };

  const insInv = db.prepare('INSERT OR REPLACE INTO inventory (id, org_id, product_id, warehouse_id, quantity) VALUES (?, ?, ?, ?, ?)');
  const insSale = db.prepare('INSERT INTO sales (id, org_id, customer_name, items, total_usd, total_bs, vendor, warehouse_id, is_direct, checkout_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const insMov = db.prepare('INSERT INTO movements (id, org_id, type, product_id, warehouse_id, qty, cost, reference, vendor, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

  const tx = db.transaction(() => {
    for (const [orgId, data] of Object.entries(seedData)) {
      const prods = prodsFor(orgId);
      if (prods.length === 0) continue;

      // Inventory
      prods.forEach((p, i) => {
        const qty = data.stock.qty[i] || 0;
        if (qty > 0) {
          insInv.run(uuidv4(), orgId, p.id, 'wh_main', qty);
          insMov.run(uuidv4(), orgId, 'entrada', p.id, 'wh_main', qty, 0, 'Stock inicial', 'admin', new Date(Date.now() - 86400000).toISOString());
        }
      });

      // Sales
      data.sales.forEach(sale => {
        const items = sale.items.map(item => {
          const prod = prods.find(p => p.name === item.name);
          return { product: { id: prod?.id || uuidv4(), name: item.name, price: item.price }, quantity: item.qty };
        });
        const usd = items.reduce((sum, i) => sum + i.quantity * i.product.price, 0);
        insSale.run(uuidv4(), orgId, sale.customer, JSON.stringify(items), usd, usd * 36.5, 'admin', 'wh_main', 1, new Date(Date.now() - 3600000).toISOString());
      });
    }
  });
  tx();

  res.json({ success: true, message: 'Test data seeded for all orgs' });
});

// ─── Serve SPA for all other routes ───────────────────────────

app.get('/{*path}', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`AInova server running on port ${PORT}`);
});
