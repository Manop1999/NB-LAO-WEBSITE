#!/usr/bin/env node
/**
 * NB LAO — Database Backup Script
 * 
 * Usage: node scripts/backup-db.js
 * 
 * Creates a timestamped backup of the SQLite database.
 * Backups are stored in the backups/ directory.
 * Never overwrites an existing backup.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Configuration ──────────────────────────────────
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'prisma', 'dev.db');
const BACKUPS_DIR = path.join(ROOT, 'backups');

// ── Main ───────────────────────────────────────────
function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   NB LAO — Database Backup           ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');

  // 1. Check source database exists
  if (!fs.existsSync(DB_PATH)) {
    console.error('ERROR: Database file not found:', DB_PATH);
    console.error('       Run "npx prisma db push" to create the database first.');
    process.exit(1);
  }

  const dbStat = fs.statSync(DB_PATH);
  console.log('Source:  ', DB_PATH);
  console.log('Size:    ', formatBytes(dbStat.size));

  // 2. Create backups directory if needed
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    console.log('Created:', BACKUPS_DIR);
  }

  // 3. Generate timestamped filename
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = 'dev-db-' + ts + '.db';
  const backupPath = path.join(BACKUPS_DIR, filename);

  // 4. Check for collision (should never happen with timestamps, but be safe)
  if (fs.existsSync(backupPath)) {
    console.error('ERROR: Backup already exists:', backupPath);
    console.error('       This should not happen. Check your clock.');
    process.exit(1);
  }

  // 5. Copy the database file
  try {
    fs.copyFileSync(DB_PATH, backupPath);
  } catch (err) {
    console.error('ERROR: Failed to copy database:', err.message);
    // Clean up partial backup
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }
    process.exit(1);
  }

  // 6. Verify the backup
  const backupStat = fs.statSync(backupPath);
  if (backupStat.size !== dbStat.size) {
    console.error('ERROR: Backup size mismatch! Expected', dbStat.size, 'got', backupStat.size);
    fs.unlinkSync(backupPath);
    process.exit(1);
  }

  // 7. Compute MD5 for integrity record
  const md5 = crypto.createHash('md5')
    .update(fs.readFileSync(backupPath))
    .digest('hex');

  console.log('');
  console.log('Backup:  ', backupPath);
  console.log('Size:    ', formatBytes(backupStat.size));
  console.log('MD5:     ', md5);
  console.log('');
  console.log('✓ Backup completed successfully.');

  // 8. Show recent backups
  const files = fs.readdirSync(BACKUPS_DIR)
    .filter(f => f.endsWith('.db'))
    .sort()
    .slice(-5);
  if (files.length > 1) {
    console.log('');
    console.log('Recent backups (' + files.length + '):');
    files.forEach(f => {
      const s = fs.statSync(path.join(BACKUPS_DIR, f));
      console.log('  ' + f + ' (' + formatBytes(s.size) + ')');
    });
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

main();
