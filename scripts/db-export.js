const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKUP_FILE = process.argv[2] || path.join(__dirname, '..', 'db_backup.sql');
const CONTAINER_NAME = process.env.DB_CONTAINER || 'game_postgres';
const DB_USER = process.env.DB_USER || 'gameuser';
const DB_NAME = process.env.DB_NAME || 'gamedb';

console.log(`\n📦 Starting PostgreSQL Database Export...`);
console.log(`- Container: ${CONTAINER_NAME}`);
console.log(`- Database:  ${DB_NAME}`);
console.log(`- Output:    ${BACKUP_FILE}\n`);

// 1. Check if container is running
try {
  const status = execSync(`docker inspect -f '{{.State.Running}}' ${CONTAINER_NAME}`, { encoding: 'utf8' }).trim();
  if (status !== 'true') {
    console.error(`❌ Container "${CONTAINER_NAME}" is not running.`);
    console.error(`👉 Start it first with: npm run db:up\n`);
    process.exit(1);
  }
} catch (err) {
  console.error(`❌ Could not find container "${CONTAINER_NAME}".`);
  console.error(`👉 Make sure Docker is running and start the database with: npm run db:up\n`);
  process.exit(1);
}

// 2. Perform pg_dump
const dumpArgs = [
  'exec',
  CONTAINER_NAME,
  'pg_dump',
  '-U', DB_USER,
  '-d', DB_NAME,
  '--clean',
  '--if-exists',
  '--no-owner',
  '--no-privileges'
];

const writeStream = fs.createWriteStream(BACKUP_FILE);
const dumpProcess = spawn('docker', dumpArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

dumpProcess.stdout.pipe(writeStream);

let errorOutput = '';
dumpProcess.stderr.on('data', (chunk) => {
  errorOutput += chunk.toString();
});

dumpProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`❌ pg_dump failed with exit code ${code}:`);
    console.error(errorOutput);
    process.exit(code);
  }

  const stats = fs.statSync(BACKUP_FILE);
  const sizeKB = (stats.size / 1024).toFixed(2);
  console.log(`✅ Database successfully exported! (${sizeKB} KB)`);

  // 3. Print row counts from the database
  try {
    const query = "SELECT 'users' as tbl, count(*) FROM users UNION ALL SELECT 'players', count(*) FROM players UNION ALL SELECT 'spaces', count(*) FROM spaces UNION ALL SELECT 'chat_messages', count(*) FROM chat_messages;";
    const countOutput = execSync(`docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} -t -A -F ": " -c "${query}"`, { encoding: 'utf8' });
    
    console.log(`\n📊 Exported Data Summary:`);
    countOutput.trim().split('\n').forEach(line => {
      if (line) console.log(`   • ${line} rows`);
    });
    console.log('');
  } catch (qErr) {
    // Non-fatal if count query fails
  }

  console.log(`🎉 Done. The file "${path.basename(BACKUP_FILE)}" is ready to be committed or shared.`);
});
