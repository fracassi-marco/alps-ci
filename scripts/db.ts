#!/usr/bin/env bun

/**
 * Database management script for Alps-CI
 * Run: bun run scripts/db.ts [command]
 */

const commands = {
  start: 'Start the database',
  stop: 'Stop the database',
  restart: 'Restart the database',
  reset: 'Reset the database (deletes all data)',
  logs: 'View database logs',
  shell: 'Open PostgreSQL shell',
  status: 'Check database status',
  backup: 'Create database backup',
};

const command = process.argv[2];

async function exec(cmd: string) {
  const proc = Bun.spawn(cmd.split(' '), {
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  });
  const exitCode = await proc.exited;
  return exitCode === 0;
}

async function main() {
  if (!command || command === 'help') {
    console.log('Alps-CI Database Management\n');
    console.log('Usage: bun run scripts/db.ts [command]\n');
    console.log('Commands:');
    for (const [cmd, desc] of Object.entries(commands)) {
      console.log(`  ${cmd.padEnd(12)} - ${desc}`);
    }
    process.exit(0);
  }

  switch (command) {
    case 'start':
      console.log('🚀 Starting database...');
      await exec('docker compose -f docker-compose.dev.yml up -d');
      console.log('✅ Database started!');
      console.log('📊 Connection: postgresql://alpsci:alpsci_dev_password@localhost:5432/alpsci');
      break;

    case 'stop':
      console.log('🛑 Stopping database...');
      await exec('docker compose -f docker-compose.dev.yml down');
      console.log('✅ Database stopped!');
      break;

    case 'restart':
      console.log('🔄 Restarting database...');
      await exec('docker compose -f docker-compose.dev.yml restart db');
      console.log('✅ Database restarted!');
      break;

    case 'reset':
      console.log('⚠️  This will delete ALL data in the database!');
      console.log('🗑️  Resetting database...');
      await exec('docker compose -f docker-compose.dev.yml down -v');
      await exec('docker compose -f docker-compose.dev.yml up -d');
      console.log('✅ Database reset complete!');
      break;

    case 'logs':
      console.log('📋 Viewing database logs (Ctrl+C to exit)...\n');
      await exec('docker compose -f docker-compose.dev.yml logs -f db');
      break;

    case 'shell':
      console.log('🐚 Opening PostgreSQL shell...\n');
      await exec('docker compose -f docker-compose.dev.yml exec db psql -U alpsci -d alpsci');
      break;

    case 'status':
      console.log('📊 Database status:\n');
      await exec('docker compose -f docker-compose.dev.yml ps db');
      console.log('\n🏥 Health check:');
      await exec('docker compose -f docker-compose.dev.yml exec db pg_isready -U alpsci');
      break;

    case 'backup':
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup-${timestamp}.sql`;
      console.log(`💾 Creating backup: ${filename}`);
      await exec(`docker compose -f docker-compose.dev.yml exec -T db pg_dump -U alpsci alpsci > ${filename}`);
      console.log(`✅ Backup created: ${filename}`);
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('Run "bun run scripts/db.ts help" for usage information');
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

