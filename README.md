# Nepshop

A full-stack e-commerce storefront built with React, Vite, Express, and Prisma.

## Stack

- Frontend: React + Vite + React Router
- Backend: Node.js + Express
- Database: SQLite for local development + Prisma ORM
- Auth: JWT + bcrypt

## Local setup

1. Install dependencies:
   npm install
2. Copy `.env.example` to `.env` and update values.
   - Local default: `DATABASE_URL="file:./prisma/dev.db"`
   - Production should use a managed relational database such as PostgreSQL.
4. Run database migrations:
   npx prisma migrate dev --name init
5. Seed sample data:
   npm run seed
6. Start the app:
   npm run dev

## Default admin account

- Email: admin@nepshop.com
- Password: Admin@123

## Production build

npm run build

## Notes

The current local database is SQLite. Keep `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`, and `VITE_API_URL` environment-specific for deployment.

The default admin account is for development only and must be changed or removed before production use.

Real payment integration is pending; do not treat the current checkout UI as proof of payment.
