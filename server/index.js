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

const cartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99).default(1),
});

const cartQuantitySchema = z.object({
  quantity: z.number().int().min(1).max(99),
});

const serializeProduct = (product) => ({
  ...product,
  price: Number(product.price),
  discountPrice: product.discountPrice ? Number(product.discountPrice) : null,
});

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

const serializeCart = (cart) => {
  const items =
    cart?.items?.map((item) => {
      const product = serializeProduct(item.product);
      const unitPrice = product.discountPrice || product.price;

      return {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        lineTotal: unitPrice * item.quantity,
        product,
      };
    }) || [];
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const shipping = subtotal === 0 ? 0 : subtotal > 1000 ? 0 : 120;

  return {
    id: cart?.id || null,
    items,
    subtotal,
    shipping,
    total: subtotal + shipping,
  };
};

const serializeOrder = (order) => ({
  id: order.id,
  status: order.status,
  paymentStatus: order.paymentStatus,
  subtotal: Number(order.subtotal),
  shipping: Number(order.shipping),
  total: Number(order.total),
  shippingAddress: JSON.parse(order.shippingAddress),
  billingAddress: order.billingAddress ? JSON.parse(order.billingAddress) : null,
  paymentMethod: order.paymentMethod,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
  items: order.orderItems.map((item) => ({
    id: item.id,
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    lineTotal: Number(item.unitPrice) * item.quantity,
    product: serializeProduct(item.product),
  })),
});

async function getOrCreateCart(userId, client = prisma) {
  const existing = await client.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: { product: { include: { category: true, images: true } } },
        orderBy: { id: "asc" },
      },
    },
  });

  if (existing) return existing;

  return client.cart.create({
    data: { userId },
    include: {
      items: {
        include: { product: { include: { category: true, images: true } } },
        orderBy: { id: "asc" },
      },
    },
  });
}

async function getCartForUser(userId, client = prisma) {
  return client.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: { product: { include: { category: true, images: true } } },
        orderBy: { id: "asc" },
      },
    },
  });
}

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

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.get("/api/cart", authMiddleware, async (req, res) => {
  const cart = await getOrCreateCart(req.user.id);
  res.json(serializeCart(cart));
});

app.post("/api/cart/items", authMiddleware, async (req, res) => {
  try {
    const parsed = cartItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid cart item", issues: parsed.error.issues });
    }

    const { productId, quantity } = parsed.data;
    const product = await prisma.product.findFirst({ where: { id: productId, active: true } });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const cart = await getOrCreateCart(req.user.id);
    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });
    const nextQuantity = (existing?.quantity || 0) + quantity;

    if (nextQuantity > product.stock) {
      return res.status(400).json({ message: `Only ${product.stock} item(s) available` });
    }

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: nextQuantity },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId, quantity },
      });
    }

    const updatedCart = await getCartForUser(req.user.id);
    res.status(201).json(serializeCart(updatedCart));
  } catch (error) {
    console.error("Add cart item error:", error);
    res.status(500).json({ message: "Unable to add item to cart" });
  }
});

app.patch("/api/cart/items/:id", authMiddleware, async (req, res) => {
  try {
    const parsed = cartQuantitySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid quantity", issues: parsed.error.issues });
    }

    const cart = await getOrCreateCart(req.user.id);
    const item = await prisma.cartItem.findFirst({
      where: { id: req.params.id, cartId: cart.id },
      include: { product: true },
    });

    if (!item) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    if (!item.product.active) {
      return res.status(400).json({ message: "Product is no longer available" });
    }

    if (parsed.data.quantity > item.product.stock) {
      return res.status(400).json({ message: `Only ${item.product.stock} item(s) available` });
    }

    await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: parsed.data.quantity },
    });

    const updatedCart = await getCartForUser(req.user.id);
    res.json(serializeCart(updatedCart));
  } catch (error) {
    console.error("Update cart item error:", error);
    res.status(500).json({ message: "Unable to update cart item" });
  }
});

app.delete("/api/cart/items/:id", authMiddleware, async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    const item = await prisma.cartItem.findFirst({
      where: { id: req.params.id, cartId: cart.id },
    });

    if (!item) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    await prisma.cartItem.delete({ where: { id: item.id } });

    const updatedCart = await getCartForUser(req.user.id);
    res.json(serializeCart(updatedCart));
  } catch (error) {
    console.error("Remove cart item error:", error);
    res.status(500).json({ message: "Unable to remove cart item" });
  }
});

app.delete("/api/cart", authMiddleware, async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    const updatedCart = await getCartForUser(req.user.id);
    res.json(serializeCart(updatedCart));
  } catch (error) {
    console.error("Clear cart error:", error);
    res.status(500).json({ message: "Unable to clear cart" });
  }
});

app.post("/api/checkout", authMiddleware, async (req, res) => {
  try {
    const parsed = orderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid checkout data", issues: parsed.error.issues });
    }

    const result = await prisma.$transaction(async (tx) => {
      const cart = await getCartForUser(req.user.id, tx);

      if (!cart || cart.items.length === 0) {
        const error = new Error("Your cart is empty");
        error.status = 400;
        throw error;
      }

      for (const item of cart.items) {
        if (!item.product.active) {
          const error = new Error(`${item.product.name} is no longer available`);
          error.status = 400;
          throw error;
        }

        if (item.quantity > item.product.stock) {
          const error = new Error(`Only ${item.product.stock} ${item.product.name} item(s) available`);
          error.status = 400;
          throw error;
        }
      }

      const subtotal = cart.items.reduce((sum, item) => {
        const price = item.product.discountPrice || item.product.price;
        return sum + price * item.quantity;
      }, 0);
      const shipping = subtotal === 0 ? 0 : subtotal > 1000 ? 0 : 120;
      const total = subtotal + shipping;

      for (const item of cart.items) {
        const updated = await tx.product.updateMany({
          where: {
            id: item.productId,
            active: true,
            stock: { gte: item.quantity },
          },
          data: { stock: { decrement: item.quantity } },
        });

        if (updated.count !== 1) {
          const error = new Error(`Insufficient stock for ${item.product.name}`);
          error.status = 400;
          throw error;
        }
      }

      const order = await tx.order.create({
        data: {
          userId: req.user.id,
          status: "PENDING",
          paymentStatus: "PENDING",
          subtotal,
          shipping,
          total,
          shippingAddress: JSON.stringify(parsed.data.address),
          paymentMethod: parsed.data.paymentMethod,
          orderItems: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.product.discountPrice || item.product.price,
            })),
          },
        },
        include: {
          orderItems: { include: { product: { include: { images: true, category: true } } } },
        },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return order;
    });

    res.status(201).json({ order: serializeOrder(result) });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(error.status || 500).json({ message: error.status ? error.message : "Unable to place order" });
  }
});

app.get("/api/orders", authMiddleware, async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    include: {
      orderItems: { include: { product: { include: { images: true, category: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({ items: orders.map(serializeOrder) });
});

app.get("/api/orders/:id", authMiddleware, async (req, res) => {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: {
      orderItems: { include: { product: { include: { images: true, category: true } } } },
    },
  });

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  res.json({ order: serializeOrder(order) });
});

app.get("/api/categories", async (req, res) => {
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  res.json(categories);
});

app.get("/api/products", async (req, res) => {
  try {
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
    const normalizedPage = Math.max(Number(page) || 1, 1);
    const normalizedLimit = Math.min(Math.max(Number(limit) || 8, 1), 48);
    const skip = (normalizedPage - 1) * normalizedLimit;

    const filters = {
      active: true,
      ...(category ? { category: { slug: String(category) } } : {}),
      ...(featured === "true" ? { featured: true } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: String(search) } },
              { description: { contains: String(search) } },
              { brand: { contains: String(search) } },
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
      take: normalizedLimit,
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
      page: normalizedPage,
      limit: normalizedLimit,
    });
  } catch (error) {
    console.error("Product listing error:", error);
    res.status(500).json({ message: "Unable to load products" });
  }
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
