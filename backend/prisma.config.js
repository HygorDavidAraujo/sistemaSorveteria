import { defineConfig } from 'prisma/config';

export default defineConfig({
  // Connection for Prisma Migrate CLI
  datasource: {
    provider: 'postgresql',
    url: process.env.DATABASE_URL || '',
  },
});
