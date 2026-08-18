import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const adminMiddleware = async (req, res, next) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
};

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const productSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().min(10),
  shortDescription: z.string().optional(),
  price: z.number().positive(),
  discountPrice: z.number().positive().optional(),
  sku: z.string().min(2),
  brand: z.string().min(2),
  categoryId: z.string().min(1),
  stock: z.number().int().min(0),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().min(0).optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  images: z
    .array(
      z.object({
        url: z.string(),
        altText: z.string().optional(),
        isPrimary: z.boolean().optional(),
      }),
    )
    .optional(),
});

const orderSchema = z.object({
  address: z.object({
    fullName: z.string().min(2),
    phone: z.string().min(7),
    line1: z.string().min(3),
    line2: z.string().optional(),
    city: z.string().min(2),
    state: z.string().min(2),
    postalCode: z.string().min(3),
    country: z.string().min(2),
  }),
  paymentMethod: z.string().min(2),
});

const serializeProduct = (product) => ({
  ...product,
  price: Number(product.price),
  discountPrice: product.discountPrice ? Number(product.discountPrice) : null,
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Nepshop API is running" });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({
          message: "Invalid registration data",
          issues: parsed.error.issues,
        });
    }

    const { name, email, password } = parsed.data;
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res
      .status(201)
      .json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Unable to register user" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid login data", issues: parsed.error.issues });
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Unable to log in" });
  }
});

app.get("/api/categories", async (req, res) => {
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  res.json(categories);
});

app.get("/api/products", async (req, res) => {
  const {
    category,
    search,
    sort,
    minPrice,
    maxPrice,
    featured,
    page = 1,
    limit = 8,
  } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filters = {
    active: true,
    ...(category ? { category: { slug: category } } : {}),
    ...(featured ? { featured: true } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: String(search), mode: "insensitive" } },
            { description: { contains: String(search), mode: "insensitive" } },
            { brand: { contains: String(search), mode: "insensitive" } },
          ],
        }
      : {}),
    ...(minPrice || maxPrice
      ? {
          price: {
            gte: Number(minPrice || 0),
            lte: Number(maxPrice || 999999),
          },
        }
      : {}),
  };

  const products = await prisma.product.findMany({
    where: filters,
    include: { category: true, images: true },
    skip,
    take: Number(limit),
    orderBy:
      sort === "price_asc"
        ? { price: "asc" }
        : sort === "price_desc"
          ? { price: "desc" }
          : { createdAt: "desc" },
  });

  const total = await prisma.product.count({ where: filters });

  res.json({
    items: products.map(serializeProduct),
    total,
    page: Number(page),
    limit: Number(limit),
  });
});

app.get("/api/products/:slug", async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { slug: req.params.slug, active: true },
    include: {
      category: true,
      images: true,
      reviews: { include: { user: { select: { name: true } } } },
    },
  });

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const related = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      active: true,
      id: { not: product.id },
    },
    include: { images: true },
    take: 4,
  });

  return res.json({
    product: serializeProduct(product),
    related: related.map(serializeProduct),
  });
});

app.get("/api/products/:id", async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id, active: true },
    include: {
      category: true,
      images: true,
      reviews: { include: { user: { select: { name: true } } } },
    },
  });

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.json({ product: serializeProduct(product) });
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Nepshop API listening on http://localhost:${PORT}`);
});
