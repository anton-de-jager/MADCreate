# MADCreate - Codex project notes

AI-native website & business-system generator. **NestJS API + Angular SPA, MySQL (Prisma ORM), DreamHost CloudCompute (PM2 + Apache reverse-proxy).**

This is NOT the .NET + MSSQL + 1-grid Plesk stack the other MAD apps use.

## Canonical infrastructure values

| Thing | Value |
| --- | --- |
| API URL | `https://madcreateapi.madprospects.com` |
| FE URL | `https://madcreate.madprospects.com` |
| DB host | `mysql.madcreate.madleads.ai:3306` (MySQL 8) |
| DB name | `madcreate` |
| No Hangfire DB | No Hangfire - this is Node.js |
| API port (PM2) | 3005 (proxied via Apache mod_proxy on DreamHost) |
