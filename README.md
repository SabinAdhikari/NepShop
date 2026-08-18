# Nepshop

A full-stack e-commerce storefront built with React, Vite, Express, and PostgreSQL via Prisma.

## Stack

- Frontend: React + Vite + React Router
- Backend: Node.js + Express
- Database: PostgreSQL + Prisma ORM
- Auth: JWT + bcrypt

## Local setup

1. Install dependencies:
   npm install
2. Create a PostgreSQL database named `nepshop`.
3. Copy `.env.example` to `.env` and update values.
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

This app is structured for deployment and can be extended with real payment integration, admin dashboards, and additional commerce features.
