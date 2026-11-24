// One-off / repeatable: add the module permissions, new roles and demo logins to an existing database.
//   npm run db:rbac
import { PrismaClient } from '@prisma/client';
import { syncRbac } from './rbac';

const db = new PrismaClient();
syncRbac(db, { demoUsers: true, password: process.env.SEED_PASSWORD })
  .then(() => console.log('RBAC synced'))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
