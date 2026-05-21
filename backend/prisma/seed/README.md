# Prisma Seed Scripts

This folder contains TypeScript seed scripts for the backend Prisma/Postgres setup.

## Scripts

- `seed-users.ts` - creates the test mart and test users
- `seed-dummy-data.ts` - creates sample products, customers, expenses, assets, attendance, payment types, expense categories, daily reports, and sales

## Run

Run the standard Prisma seed flow with:

```bash
npx prisma db seed
```

The scripts are executed through `tsx` after the Prisma client is generated.
