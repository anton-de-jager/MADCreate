-- MADCreate — bootstrap databases
-- Prisma will run migrations against the primary DB; this only ensures
-- the schema, charset, and a shadow DB for prisma migrate dev exist.

CREATE DATABASE IF NOT EXISTS madcreate
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS madcreate_shadow
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON madcreate.*        TO 'madcreate'@'%';
GRANT ALL PRIVILEGES ON madcreate_shadow.* TO 'madcreate'@'%';
FLUSH PRIVILEGES;
