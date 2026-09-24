const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

const BASE = 'http://localhost:3001';

function get(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${urlPath}`, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    }).on('error', reject);
  });
}

describe('Phase 2: Backend Foundation', () => {
  // --- Health endpoint ---

  it('GET /api/health returns 200', async () => {
    const res = await get('/api/health');
    assert.equal(res.status, 200);
  });

  it('health body has status "ok"', async () => {
    const res = await get('/api/health');
    const json = JSON.parse(res.body);
    assert.equal(json.status, 'ok');
  });

  it('health body has database "connected"', async () => {
    const res = await get('/api/health');
    const json = JSON.parse(res.body);
    assert.equal(json.database, 'connected');
  });

  it('health body has node version', async () => {
    const res = await get('/api/health');
    const json = JSON.parse(res.body);
    assert.ok(typeof json.node === 'string' && json.node.startsWith('v'));
  });

  // --- Static file serving ---

  it('GET / returns HTML', async () => {
    const res = await get('/');
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/html'));
    assert.ok(res.body.includes('NB Lao'));
  });

  it('GET /styles/nblao.css returns CSS', async () => {
    const res = await get('/styles/nblao.css');
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/css'));
  });

  it('GET /js/nblao.js returns JavaScript', async () => {
    const res = await get('/js/nblao.js');
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('javascript'));
  });

  // --- 404 ---

  it('GET /nonexistent returns 404', async () => {
    const res = await get('/nonexistent');
    assert.equal(res.status, 404);
  });

  // --- Prisma database ---

  it('Prisma can create and read a Category', async () => {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    try {
      const cat = await prisma.category.create({
        data: {
          slug: 'test-cat',
          icon: '🧪',
          localizations: {
            create: [
              { locale: 'lo', name: 'ທົດສອບ' },
              { locale: 'en', name: 'Test Category' },
            ],
          },
        },
      });
      assert.ok(cat.id > 0);
      assert.equal(cat.slug, 'test-cat');

      const found = await prisma.category.findUnique({
        where: { id: cat.id },
        include: { localizations: true },
      });
      assert.equal(found.slug, 'test-cat');
      assert.equal(found.localizations.length, 2);
    } finally {
      await prisma.categoryLocalization.deleteMany({ where: { category: { slug: 'test-cat' } } });
      await prisma.category.deleteMany({ where: { slug: 'test-cat' } });
      await prisma.$disconnect();
    }
  });
});
