const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let BACKUP_FILE = process.argv[2];
if (!BACKUP_FILE) {
  const defaultFile = path.join(__dirname, '..', 'db_backup.sql');
  const fallbackFile = path.join(__dirname, '..', 'docker', 'backup.sql');
  if (fs.existsSync(defaultFile)) {
    BACKUP_FILE = defaultFile;
  } else if (fs.existsSync(fallbackFile)) {
    BACKUP_FILE = fallbackFile;
  } else {
    BACKUP_FILE = defaultFile;
  }
} else {
  BACKUP_FILE = path.resolve(process.cwd(), BACKUP_FILE);
}

const CONTAINER_NAME = process.env.DB_CONTAINER || 'game_postgres';
const DB_USER = process.env.DB_USER || 'gameuser';
const DB_NAME = process.env.DB_NAME || 'gamedb';

console.log(`\n📥 Starting PostgreSQL Database Import...`);
console.log(`- Backup file: ${BACKUP_FILE}`);
console.log(`- Container:   ${CONTAINER_NAME}`);
console.log(`- Database:    ${DB_NAME}\n`);

// 1. Check if backup file exists
if (!fs.existsSync(BACKUP_FILE)) {
  console.error(`❌ Backup file not found: ${BACKUP_FILE}`);
  console.error(`👉 Ensure "db_backup.sql" exists in the project root, or pass the path: npm run db:import -- <path_to_sql>\n`);
  process.exit(1);
}

// 2. Check if Docker daemon is running
try {
  execSync('docker info', { stdio: 'ignore' });
} catch (err) {
  console.error(`❌ Docker is not running or not accessible.`);
  console.error(`👉 Please start Docker Desktop and try again.\n`);
  process.exit(1);
}

// 3. Ensure database container is running
function isContainerRunning() {
  try {
    const status = execSync(`docker inspect -f '{{.State.Running}}' ${CONTAINER_NAME}`, { encoding: 'utf8' }).trim();
    return status === 'true';
  } catch (err) {
    return false;
  }
}

if (!isContainerRunning()) {
  console.log(`⏳ Container "${CONTAINER_NAME}" is not running. Starting it via docker compose...`);
  try {
    execSync('docker compose up -d postgres', { stdio: 'inherit' });
  } catch (err) {
    console.error(`❌ Failed to start docker container.`);
    process.exit(1);
  }

  // Wait for postgres to be ready
  console.log(`⏳ Waiting for database to be ready...`);
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      execSync(`docker exec ${CONTAINER_NAME} pg_isready -U ${DB_USER} -d ${DB_NAME}`, { stdio: 'ignore' });
      ready = true;
      break;
    } catch {
      execSync('node -e "setTimeout(() => {}, 1000)"'); // wait 1s
    }
  }

  if (!ready) {
    console.error(`❌ Database container failed to become ready in time.`);
    process.exit(1);
  }
  console.log(`✅ Database container is ready!`);
}

// 4. Restore the database using psql
console.log(`🔄 Restoring database from "${path.basename(BACKUP_FILE)}"...`);

const restoreProcess = spawn('docker', [
  'exec',
  '-i',
  CONTAINER_NAME,
  'psql',
  '-U', DB_USER,
  '-d', DB_NAME,
  '--quiet',
  '--set', 'ON_ERROR_STOP=on'
], {
  stdio: ['pipe', 'pipe', 'pipe']
});

const readStream = fs.createReadStream(BACKUP_FILE);
readStream.pipe(restoreProcess.stdin);

let errorOutput = '';
restoreProcess.stderr.on('data', (chunk) => {
  errorOutput += chunk.toString();
});

restoreProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`\n❌ Database restore failed with exit code ${code}:`);
    console.error(errorOutput);
    process.exit(code);
  }

  console.log(`✅ Database successfully restored!\n`);

  // 5. Query and display row counts
  try {
    const query = "SELECT 'users' as tbl, count(*) FROM users UNION ALL SELECT 'players', count(*) FROM players UNION ALL SELECT 'spaces', count(*) FROM spaces UNION ALL SELECT 'chat_messages', count(*) FROM chat_messages;";
    const countOutput = execSync(`docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} -t -A -F ": " -c "${query}"`, { encoding: 'utf8' });

    console.log(`📊 Imported Data Verification:`);
    countOutput.trim().split('\n').forEach(line => {
      if (line) console.log(`   • ${line} rows`);
    });
    console.log('');
  } catch (qErr) {
    // Non-fatal
  }

  console.log(`🎉 All set! You can now start the server and client:\n   npm run dev:server\n   npm run dev:client\n`);
});
