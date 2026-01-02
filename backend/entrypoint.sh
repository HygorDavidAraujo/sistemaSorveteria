#!/bin/bash
set -e

echo "Waiting for database to be ready..."
sleep 5

echo "Generating Prisma Client..."
npx prisma generate

echo "Pushing database schema..."
npx prisma db push --accept-data-loss --skip-generate

echo "Seeding database..."
npm run db:seed || echo "Seed already executed or failed - continuing..."

echo "Starting application..."
npm run dev
