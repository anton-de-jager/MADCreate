// DreamHost CloudCompute PM2 entry point: boots the compiled NestJS app.
// PM2 launches this with cwd = the app dir; .env is read from cwd.
require('dotenv').config();
require('./dist/main');