export default {
  // Connection for Prisma Migrate
  datasource: {
    provider: 'postgresql',
    url: process.env.DATABASE_URL ?? '',
  },
};
