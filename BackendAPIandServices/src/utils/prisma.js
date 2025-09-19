const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

let prisma;

if (!global.__prisma) {
  prisma = new PrismaClient();
  prisma.$on('error', (e) => logger.error('Prisma error: %o', e));
  global.__prisma = prisma;
} else {
  prisma = global.__prisma;
}

module.exports = prisma;
