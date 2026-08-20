import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const categories = [
    {
      name: "Men",
      slug: "men",
      description: "Modern menswear essentials",
      image:
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Women",
      slug: "women",
      description: "Style-forward womenswear",
      image:
        "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Footwear",
      slug: "footwear",
      description: "Comfort and performance shoes",
      image:
        "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Beauty",
      slug: "beauty",
      description: "Skincare and beauty picks",
      image:
        "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80",
    },
  ];

  const createdCategories = [];
  for (const category of categories) {
    const existing = await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
    createdCategories.push(existing);
  }

  const products = [
    {
      name: "Roadster Shirt",
      slug: "roadster-shirt",
      description:
        "Cotton casual shirt designed for all-day comfort and everyday wear.",
      shortDescription: "Cotton casual shirt",
      price: 899,
      discountPrice: 1499,
      sku: "RDS-001",
      brand: "Roadster",
      stock: 24,
      rating: 4.7,
      reviewCount: 120,
      featured: true,
      active: true,
      categoryId: createdCategories[0].id,
      images: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=600&q=80",
            altText: "Roadster shirt",
            isPrimary: true,
          },
        ],
      },
    },
    {
      name: "DressBerry Dress",
      slug: "dressberry-dress",
      description:
        "Printed summer dress that balances comfort, movement, and effortless style.",
      shortDescription: "Printed summer dress",
      price: 1299,
      discountPrice: 2799,
      sku: "DBD-002",
      brand: "DressBerry",
      stock: 18,
      rating: 4.8,
      reviewCount: 98,
      featured: true,
      active: true,
      categoryId: createdCategories[1].id,
      images: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=600&q=80",
            altText: "DressBerry dress",
            isPrimary: true,
          },
        ],
      },
    },
    {
      name: "Nike Runner",
      slug: "nike-runner",
      description:
        "Running sneakers with responsive cushioning for active movement and everyday wear.",
      shortDescription: "Running sneakers",
      price: 2499,
      discountPrice: 4995,
      sku: "NKE-003",
      brand: "Nike",
      stock: 14,
      rating: 4.9,
      reviewCount: 210,
      featured: true,
      active: true,
      categoryId: createdCategories[2].id,
      images: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
            altText: "Nike runner",
            isPrimary: true,
          },
        ],
      },
    },
    {
      name: "Maybelline Kit",
      slug: "maybelline-kit",
      description:
        "Beauty starter kit with essentials for a polished daily routine.",
      shortDescription: "Beauty starter kit",
      price: 699,
      discountPrice: 1499,
      sku: "MYB-004",
      brand: "Maybelline",
      stock: 33,
      rating: 4.6,
      reviewCount: 87,
      featured: true,
      active: true,
      categoryId: createdCategories[3].id,
      images: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80",
            altText: "Maybelline kit",
            isPrimary: true,
          },
        ],
      },
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        ...product,
        images: {
          deleteMany: {},
          create: product.images.create,
        },
      },
      create: product,
    });
  }

  const adminEmail = "admin@nepshop.com";
  const adminPassword = "Admin@123";
  const hashed = await import("bcryptjs").then(({ default: bcrypt }) =>
    bcrypt.hash(adminPassword, 10),
  );

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", passwordHash: hashed },
    create: {
      name: "Admin User",
      email: adminEmail,
      passwordHash: hashed,
      role: "ADMIN",
    },
  });

  console.log("Seed data created successfully");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
