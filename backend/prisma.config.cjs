const { defineConfig } = require('prisma');

module.exports = defineConfig({
  datasource: {
    provider: 'postgresql',
    url: process.env.DATABASE_URL || '',
  },
});
