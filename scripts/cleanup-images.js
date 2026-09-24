#!/usr/bin/env node
'use strict';

/**
 * cleanup-images.js — Detect and optionally remove orphaned product images/documents.
 *
 * Orphaned = a file in uploads/products/ that is not referenced by any
 * ProductImage.url or ProductDocument.fileUrl in the database.
 *
 * Usage:
 *   node scripts/cleanup-images.js            Scan only (default, dry-run)
 *   node scripts/cleanup-images.js --dry-run  Explicit dry-run, list orphans
 *   node scripts/cleanup-images.js --delete   Actually delete orphaned files
 *
 * Options:
 *   --verbose   Show every referenced file (not just orphans)
 */

const fs   = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const ROOT      = path.resolve(__dirname, '..');
const UPLOADS   = path.join(ROOT, 'uploads', 'products');

const args      = process.argv.slice(2);
const dryRun    = args.includes('--dry-run') || !args.includes('--delete');
const doDelete  = args.includes('--delete');
const verbose   = args.includes('--verbose');

/* ── helpers ──────────────────────────────────────────── */

/** Normalise a DB URL to the relative path portion we can match against the filesystem. */
function normaliseUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let url = raw.trim();
  // Strip leading slash so "/uploads/products/foo.jpg" → "uploads/products/foo.jpg"
  if (url.startsWith('/')) url = url.slice(1);
  // Only care about local uploads — skip external URLs
  if (!url.startsWith('uploads/')) return null;
  return url;
}

function fmtBytes(bytes) {
  if (bytes < 1024)         return bytes + ' B';
  if (bytes < 1024 * 1024)  return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/* ── main ─────────────────────────────────────────────── */

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  NB LAO — Orphaned Image / Document Cleanup  ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  // 1. Collect referenced URLs from the database
  console.log('Connecting to database...');
  const prisma = new PrismaClient({ log: ['error'] });

  let images, documents;
  try {
    images    = await prisma.productImage.findMany({    select: { url: true } });
    documents = await prisma.productDocument.findMany({ select: { fileUrl: true } });
  } catch (err) {
    console.error('ERROR: Failed to query database:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }

  const referencedFiles = new Set();
  for (const img of images) {
    const norm = normaliseUrl(img.url);
    if (norm) referencedFiles.add(path.normalize(norm));
  }
  for (const doc of documents) {
    const norm = normaliseUrl(doc.fileUrl);
    if (norm) referencedFiles.add(path.normalize(norm));
  }

  console.log(`  Database references: ${images.length} images + ${documents.length} documents`);
  console.log(`  Local file references: ${referencedFiles.size}`);
  console.log('');

  if (verbose) {
    console.log('Referenced local files:');
    for (const f of referencedFiles) {
      console.log('  ✓ ' + f);
    }
    console.log('');
  }

  // 2. Scan the uploads/products directory
  if (!fs.existsSync(UPLOADS)) {
    console.log('No uploads/products/ directory found — nothing to do.');
    process.exit(0);
  }

  const filesOnDisk = [];
  function walkDir(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(full);
      } else {
        const rel = path.relative(ROOT, full);
        filesOnDisk.push({ full, rel: path.normalize(rel), name: entry.name });
      }
    }
  }
  walkDir(UPLOADS);

  console.log(`  Files on disk: ${filesOnDisk.length}`);
  console.log('');

  // 3. Find orphans
  const orphans = filesOnDisk.filter(f => !referencedFiles.has(f.rel));
  const totalOrphanSize = orphans.reduce((sum, f) => {
    try { return sum + fs.statSync(f.full).size; } catch (_) { return sum; }
  }, 0);

  if (orphans.length === 0) {
    console.log('✅ No orphaned files found — everything is clean.');
    process.exit(0);
  }

  console.log(`⚠  Found ${orphans.length} orphaned file(s) (${fmtBytes(totalOrphanSize)}):`);
  console.log('');
  for (const f of orphans) {
    try {
      const stat = fs.statSync(f.full);
      console.log(`  ✗ ${f.rel}  (${fmtBytes(stat.size)}, ${new Date(stat.mtimeMs).toISOString().slice(0, 10)})`);
    } catch (_) {
      console.log(`  ✗ ${f.rel}  (unable to stat)`);
    }
  }
  console.log('');

  // 4. Action
  if (dryRun) {
    console.log(`Dry-run mode — ${orphans.length} file(s) NOT deleted.`);
    console.log('Run with --delete to remove orphaned files.');
    process.exit(0);
  }

  // --delete mode
  console.log('Deleting orphaned files...');
  let deleted = 0;
  let errors  = 0;
  for (const f of orphans) {
    try {
      fs.unlinkSync(f.full);
      deleted++;
    } catch (err) {
      console.error(`  ERROR deleting ${f.rel}: ${err.message}`);
      errors++;
    }
  }

  // Clean up empty directories
  function cleanEmptyDirs(dir) {
    // Never remove the uploads/products root directory
    if (path.resolve(dir) === path.resolve(UPLOADS)) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) cleanEmptyDirs(path.join(dir, entry.name));
      }
      return;
    }
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) cleanEmptyDirs(path.join(dir, entry.name));
    }
    try {
      const remaining = fs.readdirSync(dir);
      if (remaining.length === 0) {
        fs.rmdirSync(dir);
        console.log(`  Removed empty directory: ${path.relative(ROOT, dir)}`);
      }
    } catch (_) {}
  }
  cleanEmptyDirs(UPLOADS);

  console.log('');
  console.log(`Done: ${deleted} deleted, ${errors} errors.`);
  if (errors > 0) process.exit(1);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
