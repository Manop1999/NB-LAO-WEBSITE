const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dbName = `seed-images-${process.pid}.db`;
const dbPath = path.join(root, 'prisma', dbName);
const databaseUrl = `file:./${dbName}`;

fs.copyFileSync(path.join(root, 'prisma', 'dev.db'), dbPath);

describe('Seeded product images', () => {
  it('does not create local image records unless their files are served from the project', async () => {
    execFileSync(process.execPath, ['backend/seed.js'], {
      cwd: root,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'pipe',
    });

    const previousUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = databaseUrl;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    try {
      const images = await prisma.productImage.findMany({ select: { url: true } });
      for (const image of images.filter(({ url }) => url.startsWith('/'))) {
        const filePath = path.join(root, image.url.slice(1));
        assert.ok(fs.existsSync(filePath), `Seeded image URL must resolve to a project file: ${image.url}`);
      }
    } finally {
      await prisma.$disconnect();
      if (previousUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousUrl;
    }
  });
});

after(() => {
  fs.rmSync(dbPath, { force: true });
});
