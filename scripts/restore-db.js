#!/usr/bin/env node
/**
 * NB LAO — Database Restore Script
 * 
 * Usage: node scripts/restore-db.js <backup-file>
 *        node scripts/restore-db.js --list
 * 
 * Restores the SQLite database from a backup file.
 * Requires explicit --force flag to overwrite the active database.
 * Preserves the current database as a pre-restore backup.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Configuration ──────────────────────────────────
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'prisma', 'dev.db');
const BACKUPS_DIR = path.join(ROOT, 'backups');

// ── Parse arguments ────────────────────────────────
const args = process.argv.slice(2);
const force = args.includes('--force');
const listMode = args.includes('--list');
const backupFile = args.find(a => !a.startsWith('-'));

// ── List mode ──────────────────────────────────────
function listBackups() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    console.log('No backups directory found.');
    return;
  }
  const files = fs.readdirSync(BACKUPS_DIR)
    .filter(f => f.endsWith('.db'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    console.log('No backups found in', BACKUPS_DIR);
    return;
  }
  
  console.log('Available backups (' + files.length + '):');
  console.log('');
  files.forEach(f => {
    const full = path.join(BACKUPS_DIR, f);
    const s = fs.statSync(full);
    const md5 = crypto.createHash('md5').update(fs.readFileSync(full)).digest('hex');
    console.log('  ' + f);
    console.log('    Size: ' + formatBytes(s.size) + '  MD5: ' + md5);
  });
}

// ── Main restore ───────────────────────────────────
function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   NB LAO — Database Restore          ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');

  if (listMode) {
    listBackups();
    return;
  }

  // 1. Validate backup file argument
  if (!backupFile) {
    console.error('Usage: node scripts/restore-db.js <backup-file>');
    console.error('       node scripts/restore-db.js --list');
    console.error('');
    console.error('Options:');
    console.error('  --force    Skip confirmation prompt');
    console.error('  --list     List available backups');
    process.exit(1);
  }

  // 2. Resolve backup path (support both absolute and relative paths)
  let backupPath;
  if (path.isAbsolute(backupFile)) {
    backupPath = backupFile;
  } else if (backupFile.includes('/') || backupFile.includes('\\')) {
    backupPath = path.resolve(ROOT, backupFile);
  } else {
    // Check backups/ directory first, then treat as relative path
    const inBackups = path.join(BACKUPS_DIR, backupFile);
    if (fs.existsSync(inBackups)) {
      backupPath = inBackups;
    } else {
      backupPath = path.resolve(ROOT, backupFile);
    }
  }

  // 3. Validate backup file exists
  if (!fs.existsSync(backupPath)) {
    console.error('ERROR: Backup file not found:', backupPath);
    console.error('');
    console.error('Run "node scripts/restore-db.js --list" to see available backups.');
    process.exit(1);
  }

  // 4. Validate backup file is non-empty
  const backupStat = fs.statSync(backupPath);
  if (backupStat.size === 0) {
    console.error('ERROR: Backup file is empty:', backupPath);
    process.exit(1);
  }

  // 5. Validate it's a valid SQLite file (check magic bytes)
  const header = Buffer.alloc(16);
  const fd = fs.openSync(backupPath, 'r');
  fs.readSync(fd, header, 0, 16, 0);
  fs.closeSync(fd);
  
  const magic = header.slice(0, 16).toString('ascii');
  if (!magic.startsWith('SQLite format 3')) {
    console.error('ERROR: File does not appear to be a valid SQLite database:', backupPath);
    console.error('       Magic bytes:', JSON.stringify(header.slice(0, 16).toString('ascii')));
    process.exit(1);
  }

  // 6. Show what will happen
  const backupMd5 = crypto.createHash('md5').update(fs.readFileSync(backupPath)).digest('hex');
  console.log('Backup:  ', backupPath);
  console.log('Size:    ', formatBytes(backupStat.size));
  console.log('MD5:     ', backupMd5);
  console.log('');

  if (fs.existsSync(DB_PATH)) {
    const currentStat = fs.statSync(DB_PATH);
    const currentMd5 = crypto.createHash('md5').update(fs.readFileSync(DB_PATH)).digest('hex');
    console.log('Current: ', DB_PATH);
    console.log('Size:    ', formatBytes(currentStat.size));
    console.log('MD5:     ', currentMd5);
    console.log('');
    
    if (currentMd5 === backupMd5) {
      console.log('✓ Current database is identical to backup. Nothing to do.');
      return;
    }
  } else {
    console.log('Current: No active database found');
    console.log('');
  }

  // 7. Confirmation prompt (unless --force)
  if (!force) {
    console.log('This will REPLACE the active database with the backup.');
    console.log('A pre-restore backup will be saved automatically.');
    console.log('');
    console.log('Run with --force to skip this prompt.');
    process.exit(0);
  }

  // 8. Create pre-restore backup of current database
  if (fs.existsSync(DB_PATH)) {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    const preRestoreTs = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const preRestorePath = path.join(BACKUPS_DIR, 'pre-restore-' + preRestoreTs + '.db');
    fs.copyFileSync(DB_PATH, preRestorePath);
    console.log('Pre-restore backup:', preRestorePath);
  }

  // 9. Restore the database
  try {
    fs.copyFileSync(backupPath, DB_PATH);
  } catch (err) {
    console.error('ERROR: Failed to restore database:', err.message);
    process.exit(1);
  }

  // 10. Verify the restore
  const restoredStat = fs.statSync(DB_PATH);
  const restoredMd5 = crypto.createHash('md5').update(fs.readFileSync(DB_PATH)).digest('hex');
  
  if (restoredMd5 !== backupMd5) {
    console.error('ERROR: Restore verification failed! MD5 mismatch.');
    console.error('  Expected:', backupMd5);
    console.error('  Got:     ', restoredMd5);
    process.exit(1);
  }

  console.log('');
  console.log('Restored:', DB_PATH);
  console.log('Size:    ', formatBytes(restoredStat.size));
  console.log('MD5:     ', restoredMd5);
  console.log('');
  console.log('✓ Restore completed successfully.');
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

main();
