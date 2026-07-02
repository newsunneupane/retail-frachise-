import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { URL } from 'node:url';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

dotenv.config();

const normalizeDatabaseUrl = (value) => {
  if (!value) return value;

  try {
    const parsed = new URL(value);
    if (parsed.password) {
      parsed.password = encodeURIComponent(decodeURIComponent(parsed.password));
    }
    return parsed.toString();
  } catch {
    return value;
  }
};

const app = express();
const PORT = process.env.PORT || 4000;
const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
}
const hasDatabaseConfig = Boolean(databaseUrl);
const prisma = hasDatabaseConfig ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : null;

app.use(cors());
app.use(express.json());

const serializeProduct = (product) => ({
  ...product,
  price: product.basePrice ? Number(product.basePrice) : 0,
  basePrice: product.basePrice ? Number(product.basePrice) : 0,
});

const getOrCreateDefaultCategory = async () => {
  if (!prisma) {
    return { id: 'fallback-category' };
  }

  let category = await prisma.category.findFirst({ where: { name: 'General' } });
  if (!category) {
    category = await prisma.category.create({ data: { name: 'General' } });
  }
  return category;
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// GET: Fetch all products
app.get('/api/products', async (req, res) => {
  if (!prisma) {
    res.json([]);
    return;
  }

  try {
    const products = await prisma.product.findMany();
    res.json(products.map(serializeProduct));
  } catch (error) {
    console.error(error);
    res.json([]);
  }
});

// POST: Add a new product
app.post('/api/products', async (req, res) => {
  const { sku, name, price } = req.body;

  if (!prisma) {
    res.status(503).json({ error: 'Database is unavailable' });
    return;
  }

  try {
    const parsedPrice = Number(price);
    const category = await getOrCreateDefaultCategory();
    const newProduct = await prisma.product.create({
      data: {
        sku,
        name,
        basePrice: parsedPrice,
        categoryId: category.id,
      },
    });
    res.status(201).json(serializeProduct(newProduct));
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Failed to create product', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 JavaScript Backend running on http://localhost:${PORT}`);
});