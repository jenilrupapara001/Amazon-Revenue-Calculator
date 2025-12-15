import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { MongoClient } from 'mongodb';
import { randomUUID } from 'crypto';

const PORT = process.env.PORT || 5001;
const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'fba_calculator_pro';

if (!MONGO_URL) {
  console.error('[Config] Missing MONGO_URL environment variable');
  process.exit(1);
}

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
};

const app = express();
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(bodyParser.json({ limit: '2mb' }));

let client;
let db;

// --- Seed data (mirrors previous defaults) ---
const INITIAL_CLOSING = [
  { id: 'c1', minPrice: 0, maxPrice: 300, fee: 26, sellerType: 'FC' },
  { id: 'c2', minPrice: 301, maxPrice: 500, fee: 21, sellerType: 'FC' },
  { id: 'c3', minPrice: 501, maxPrice: 1000, fee: 26, sellerType: 'FC' },
  { id: 'c4', minPrice: 1001, maxPrice: 99999999, fee: 51, sellerType: 'FC' },
];

const INITIAL_REFUND_FEES = [
  { id: 'rf1', minPrice: 0, maxPrice: 300, basic: 50, standard: 45, advanced: 40, premium: 40, category: 'General' },
  { id: 'rf2', minPrice: 301, maxPrice: 500, basic: 75, standard: 70, advanced: 65, premium: 65, category: 'General' },
  { id: 'rf3', minPrice: 501, maxPrice: 1000, basic: 100, standard: 95, advanced: 85, premium: 85, category: 'General' },
  { id: 'rf4', minPrice: 1001, maxPrice: 99999999, basic: 140, standard: 130, advanced: 110, premium: 110, category: 'General' },
  { id: 'rf5', minPrice: 0, maxPrice: 300, basic: 30, standard: 27, advanced: 24, premium: 24, category: 'Apparel' },
  { id: 'rf6', minPrice: 301, maxPrice: 500, basic: 45, standard: 42, advanced: 39, premium: 39, category: 'Apparel' },
  { id: 'rf7', minPrice: 501, maxPrice: 1000, basic: 60, standard: 57, advanced: 51, premium: 51, category: 'Apparel' },
  { id: 'rf8', minPrice: 1001, maxPrice: 99999999, basic: 84, standard: 78, advanced: 66, premium: 66, category: 'Apparel' },
  { id: 'rf9', minPrice: 0, maxPrice: 300, basic: 35, standard: 32, advanced: 28, premium: 28, category: 'Shoes' },
  { id: 'rf10', minPrice: 301, maxPrice: 500, basic: 50, standard: 47, advanced: 42, premium: 42, category: 'Shoes' },
  { id: 'rf11', minPrice: 501, maxPrice: 1000, basic: 65, standard: 62, advanced: 55, premium: 55, category: 'Shoes' },
  { id: 'rf12', minPrice: 1001, maxPrice: 99999999, basic: 90, standard: 85, advanced: 72, premium: 72, category: 'Shoes' },
];

const INITIAL_REFERRAL = [
  { id: 'r1', category: 'Electronics', tiers: [{ minPrice: 0, maxPrice: 99999999, percentage: 8 }] },
  { id: 'r2', category: 'Books', tiers: [{ minPrice: 0, maxPrice: 99999999, percentage: 15 }] },
  { id: 'r3', category: 'Clothing', tiers: [{ minPrice: 0, maxPrice: 99999999, percentage: 17 }] },
  { id: 'r4', category: 'Home & Kitchen', tiers: [{ minPrice: 0, maxPrice: 99999999, percentage: 15 }] },
  { id: 'r5', category: 'Health & Personal Care', tiers: [{ minPrice: 0, maxPrice: 99999999, percentage: 15 }] },
  { id: 'r6', category: 'Toys & Games', tiers: [{ minPrice: 0, maxPrice: 99999999, percentage: 15 }] },
  { id: 'r7', category: 'Sports & Outdoors', tiers: [{ minPrice: 0, maxPrice: 99999999, percentage: 15 }] },
  { id: 'r8', category: 'Automotive', tiers: [{ minPrice: 0, maxPrice: 99999999, percentage: 12 }] },
  { id: 'r9', category: 'Tools & Home Improvement', tiers: [{ minPrice: 0, maxPrice: 99999999, percentage: 12 }] },
  { id: 'r10', category: 'Beauty', tiers: [{ minPrice: 0, maxPrice: 99999999, percentage: 15 }] },
];

const INITIAL_SHIPPING = [
  { id: 's1', sizeType: 'Standard', weightMin: 0, weightMax: 500, fee: 65, pickAndPackFee: 17 },
  { id: 's2', sizeType: 'Standard', weightMin: 501, weightMax: 1000, fee: 85, pickAndPackFee: 17 },
  { id: 's3', sizeType: 'Standard', weightMin: 1001, weightMax: 2000, fee: 122, pickAndPackFee: 17 },
  { id: 's4', sizeType: 'Standard', weightMin: 2001, weightMax: 5000, fee: 122, pickAndPackFee: 37, useIncremental: true, incrementalStep: 1000, incrementalFee: 34 },
  { id: 's5', sizeType: 'Standard', weightMin: 5001, weightMax: 99999999, fee: 224, pickAndPackFee: 37, useIncremental: true, incrementalStep: 1000, incrementalFee: 18 },
  { id: 'h1', sizeType: 'Heavy', weightMin: 0, weightMax: 12000, fee: 300, pickAndPackFee: 26 },
  { id: 'h2', sizeType: 'Heavy', weightMin: 12001, weightMax: 25000, fee: 300, pickAndPackFee: 31, useIncremental: true, incrementalStep: 1000, incrementalFee: 18 },
  { id: 'h3', sizeType: 'Heavy', weightMin: 25001, weightMax: 99999999, fee: 534, pickAndPackFee: 41, useIncremental: true, incrementalStep: 1000, incrementalFee: 12 },
];

const INITIAL_MAPPINGS = [
  { id: 'm1', keepaCategory: 'electronics', feeCategory: 'Electronics' },
  { id: 'm2', keepaCategory: 'books', feeCategory: 'Books' },
  { id: 'm3', keepaCategory: 'clothing', feeCategory: 'Clothing' },
  { id: 'm4', keepaCategory: 'apparel', feeCategory: 'Clothing' },
  { id: 'm5', keepaCategory: 'kitchen', feeCategory: 'Home & Kitchen' },
  { id: 'm6', keepaCategory: 'health', feeCategory: 'Health & Personal Care' },
  { id: 'm7', keepaCategory: 'toys', feeCategory: 'Toys & Games' },
  { id: 'm8', keepaCategory: 'sports', feeCategory: 'Sports & Outdoors' },
  { id: 'm9', keepaCategory: 'automotive', feeCategory: 'Automotive' },
  { id: 'm10', keepaCategory: 'tools', feeCategory: 'Tools & Home Improvement' },
  { id: 'm11', keepaCategory: 'beauty', feeCategory: 'Beauty' },
];

const INITIAL_NODE_MAPS = [
  { id: 'nm1', nodeId: '1571272031', feeCategoryName: 'Electronics' },
  { id: 'nm2', nodeId: '283155', feeCategoryName: 'Books' },
  { id: 'nm3', nodeId: '1571271031', feeCategoryName: 'Clothing' },
  { id: 'nm4', nodeId: '1571263031', feeCategoryName: 'Home & Kitchen' },
  { id: 'nm5', nodeId: '1571267031', feeCategoryName: 'Health & Personal Care' },
];

const INITIAL_STORAGE = [
  { id: 'st1', duration: 'Monthly', rate: 45, description: 'Standard Monthly Rate' },
];

async function connectMongo() {
  // Force TLS for hosted environments like Render where Atlas requires it.
  // Using Server API v1 keeps the handshake stable across driver versions.
  client = new MongoClient(MONGO_URL, {
    tls: true,
    serverApi: { version: '1' },
  });
  await client.connect();
  db = client.db(DB_NAME);
  console.log(`[Server] Connected to MongoDB database "${DB_NAME}"`);
}

async function seedCollection(name, data) {
  const col = db.collection(name);
  const count = await col.estimatedDocumentCount();
  if (count === 0 && data.length > 0) {
    await col.insertMany(data);
    console.log(`[Seed] Inserted ${data.length} docs into ${name}`);
  }
}

async function seedAll() {
  await seedCollection('referral_fees', INITIAL_REFERRAL);
  await seedCollection('closing_fees', INITIAL_CLOSING);
  await seedCollection('shipping_fees', INITIAL_SHIPPING);
  await seedCollection('storage_fees', INITIAL_STORAGE);
  await seedCollection('category_mappings', INITIAL_MAPPINGS);
  await seedCollection('node_mappings', INITIAL_NODE_MAPS);
  await seedCollection('refund_fees', INITIAL_REFUND_FEES);

  const users = db.collection('users');
  const existingAdmin = await users.findOne({ email: 'info@easysell.in' });
  if (!existingAdmin) {
    await users.insertOne({
      id: 'admin-1',
      email: 'info@easysell.in',
      password: 'Easysell@123',
      role: 'admin',
    });
    console.log('[Seed] Admin user created (info@easysell.in / Easysell@123)');
  }
}

// --- Generic helpers ---
const collections = {
  referral: 'referral_fees',
  closing: 'closing_fees',
  shipping: 'shipping_fees',
  storage: 'storage_fees',
  mappings: 'category_mappings',
  nodemaps: 'node_mappings',
  refund: 'refund_fees',
  asins: 'asins',
};

function ensureId(doc) {
  if (!doc.id) doc.id = randomUUID();
  return doc;
}

// --- Auth ---
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = await db.collection('users').findOne({ email, password });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  res.json({ id: user.id, email: user.email, role: user.role });
});

// --- Generic CRUD routes ---
app.get('/api/fees/:type', async (req, res) => {
  const type = req.params.type;
  const colName = collections[type];
  if (!colName) return res.status(400).json({ message: 'Invalid collection' });
  const docs = await db.collection(colName).find().toArray();
  res.json(docs);
});

app.post('/api/fees/:type', async (req, res) => {
  const type = req.params.type;
  const colName = collections[type];
  if (!colName) return res.status(400).json({ message: 'Invalid collection' });
  const doc = ensureId(req.body);
  await db.collection(colName).updateOne({ id: doc.id }, { $set: doc }, { upsert: true });
  res.json({ ok: true, id: doc.id });
});

app.delete('/api/fees/:type/:id', async (req, res) => {
  const type = req.params.type;
  const { id } = req.params;
  const colName = collections[type];
  if (!colName) return res.status(400).json({ message: 'Invalid collection' });
  await db.collection(colName).deleteOne({ id });
  res.json({ ok: true });
});

app.delete('/api/fees/:type/all', async (req, res) => {
  const type = req.params.type;
  const colName = collections[type];
  if (!colName) return res.status(400).json({ message: 'Invalid collection' });
  await db.collection(colName).deleteMany({});
  res.json({ ok: true });
});

// --- ASINs ---
app.get('/api/asins', async (_req, res) => {
  const docs = await db.collection('asins').find().toArray();
  res.json(docs);
});

app.post('/api/asins/bulk', async (req, res) => {
  const items = (req.body || []).map((i) =>
    ensureId({
      ...i,
      status: i.status || 'pending',
      stepLevel: i.stepLevel || 'Standard',
      createdAt: i.createdAt || new Date().toISOString(),
    })
  );
  if (items.length === 0) return res.json({ ok: true, inserted: 0 });
  const bulk = db.collection('asins').initializeUnorderedBulkOp();
  for (const item of items) {
    bulk.find({ id: item.id }).upsert().replaceOne(item);
  }
  await bulk.execute();
  res.json({ ok: true, inserted: items.length });
});

app.put('/api/asins/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  await db.collection('asins').updateOne({ id }, { $set: updates });
  res.json({ ok: true });
});

app.delete('/api/asins/:id', async (req, res) => {
  const { id } = req.params;
  await db.collection('asins').deleteOne({ id });
  res.json({ ok: true });
});

app.delete('/api/asins', async (_req, res) => {
  await db.collection('asins').deleteMany({});
  res.json({ ok: true });
});

// --- Category mappings / node maps convenience endpoints ---
app.get('/api/mappings', async (_req, res) => {
  const docs = await db.collection('category_mappings').find().toArray();
  res.json(docs);
});
app.post('/api/mappings', async (req, res) => {
  const doc = ensureId(req.body);
  await db.collection('category_mappings').updateOne({ id: doc.id }, { $set: doc }, { upsert: true });
  res.json({ ok: true, id: doc.id });
});
app.delete('/api/mappings/:id', async (req, res) => {
  await db.collection('category_mappings').deleteOne({ id: req.params.id });
  res.json({ ok: true });
});
app.delete('/api/mappings/all', async (_req, res) => {
  await db.collection('category_mappings').deleteMany({});
  res.json({ ok: true });
});

app.get('/api/nodemaps', async (_req, res) => {
  const docs = await db.collection('node_mappings').find().toArray();
  res.json(docs);
});
app.post('/api/nodemaps', async (req, res) => {
  const doc = ensureId(req.body);
  await db.collection('node_mappings').updateOne({ id: doc.id }, { $set: doc }, { upsert: true });
  res.json({ ok: true, id: doc.id });
});
app.delete('/api/nodemaps/:id', async (req, res) => {
  await db.collection('node_mappings').deleteOne({ id: req.params.id });
  res.json({ ok: true });
});
app.delete('/api/nodemaps/all', async (_req, res) => {
  await db.collection('node_mappings').deleteMany({});
  res.json({ ok: true });
});

// --- Storage fees ---
app.get('/api/fees/storage', async (_req, res) => {
  const docs = await db.collection('storage_fees').find().toArray();
  res.json(docs);
});

async function start() {
  await connectMongo();
  await seedAll();
  app.listen(PORT, () => console.log(`[Server] API listening on http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});

