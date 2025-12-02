#!/usr/bin/env bun

// Rotate old execution logs
// Usage: bun rotate-logs.js [--keep-months 6] [--dry-run]
// Deletes log files older than specified months (default: 6)

import { readdirSync, statSync, unlinkSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const logsDir = join(homedir(), 'Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/knowledge/execution-logs');

// Parse arguments
const args = process.argv.slice(2);
const keepMonths = parseInt(args.find(a => a.startsWith('--keep-months='))?.split('=')[1] || '6');
const dryRun = args.includes('--dry-run');

if (!existsSync(logsDir)) {
  console.log('No logs directory found. Nothing to rotate.');
  process.exit(0);
}

// Calculate cutoff date (N months ago)
const cutoffDate = new Date();
cutoffDate.setMonth(cutoffDate.getMonth() - keepMonths);

console.log(`Rotating logs older than ${cutoffDate.toLocaleDateString()} (${keepMonths} months ago)`);
if (dryRun) {
  console.log('DRY RUN - no files will be deleted\n');
}

let deletedCount = 0;
let deletedSize = 0;
let keptCount = 0;

// Iterate through year-month directories
const yearMonthDirs = readdirSync(logsDir);

for (const yearMonth of yearMonthDirs) {
  const dirPath = join(logsDir, yearMonth);

  if (!statSync(dirPath).isDirectory()) continue;

  // Parse year-month (e.g., "2025-12")
  const [year, month] = yearMonth.split('-').map(n => parseInt(n));
  const dirDate = new Date(year, month - 1, 1);

  if (dirDate < cutoffDate) {
    // Delete all logs in this directory
    const files = readdirSync(dirPath);

    for (const file of files) {
      const filePath = join(dirPath, file);
      const stats = statSync(filePath);

      deletedSize += stats.size;
      deletedCount++;

      if (!dryRun) {
        unlinkSync(filePath);
      }

      console.log(`${dryRun ? '[DRY RUN] Would delete' : 'Deleted'}: ${yearMonth}/${file}`);
    }

    // Remove empty directory
    if (!dryRun) {
      try {
        const { rmdirSync } = require('fs');
        rmdirSync(dirPath);
        console.log(`Removed directory: ${yearMonth}`);
      } catch (e) {
        // Directory not empty or already deleted
      }
    }
  } else {
    // Count kept files
    const files = readdirSync(dirPath);
    keptCount += files.length;
  }
}

const sizeMB = (deletedSize / 1024 / 1024).toFixed(2);

console.log('\n---');
console.log(`${dryRun ? 'Would delete' : 'Deleted'}: ${deletedCount} log files (${sizeMB} MB)`);
console.log(`Kept: ${keptCount} log files`);

if (dryRun) {
  console.log('\nRun without --dry-run to actually delete files');
}
