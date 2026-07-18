import * as fs from 'node:fs';
import * as path from 'node:path';
import * as bcrypt from 'bcryptjs';

const HTPASSWD_PATH = path.join(__dirname, '../docker/.htpasswd');

function ensureDirectoryExistence(filePath: string) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

function readHtpasswd(): Record<string, string> {
  if (!fs.existsSync(HTPASSWD_PATH)) {
    return {};
  }
  const content = fs.readFileSync(HTPASSWD_PATH, 'utf-8');
  const lines = content.split(/\r?\n/);
  const users: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const parts = trimmed.split(':');
    if (parts.length >= 2) {
      const username = parts[0].trim();
      const hash = parts.slice(1).join(':').trim();
      users[username] = hash;
    }
  }
  return users;
}

function writeHtpasswd(users: Record<string, string>) {
  ensureDirectoryExistence(HTPASSWD_PATH);
  const lines = Object.entries(users).map(([username, hash]) => `${username}:${hash}`);
  fs.writeFileSync(HTPASSWD_PATH, lines.join('\n') + '\n', 'utf-8');
}

function showUsage() {
  console.log(`
Usage:
  npx ts-node scripts/manage-auth.ts add <username> <password>
  npx ts-node scripts/manage-auth.ts remove <username>
  npx ts-node scripts/manage-auth.ts list
  npx ts-node scripts/manage-auth.ts init-defaults
  `);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    showUsage();
    process.exit(1);
  }

  const command = args[0].toLowerCase();

  switch (command) {
    case 'add': {
      const username = args[1];
      const password = args[2];
      if (!username || !password) {
        console.error('Error: Both username and password are required.');
        showUsage();
        process.exit(1);
      }

      const users = readHtpasswd();
      // Nginx requires bcrypt hashes to start with $2y$ (or $2a$)
      // bcryptjs.hashSync creates hashes starting with $2a$, which is fully compatible with Nginx.
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);

      users[username] = hash;
      writeHtpasswd(users);

      console.log(`Successfully added/updated user: "${username}" in docker/.htpasswd`);
      break;
    }

    case 'remove': {
      const username = args[1];
      if (!username) {
        console.error('Error: Username is required.');
        showUsage();
        process.exit(1);
      }

      const users = readHtpasswd();
      if (!users[username]) {
        console.error(`Error: User "${username}" not found in docker/.htpasswd`);
        process.exit(1);
      }

      delete users[username];
      writeHtpasswd(users);

      console.log(`Successfully removed user: "${username}" from docker/.htpasswd`);
      break;
    }

    case 'list': {
      const users = readHtpasswd();
      const usernames = Object.keys(users);
      if (usernames.length === 0) {
        console.log('No users found in docker/.htpasswd');
      } else {
        console.log('Configured users in docker/.htpasswd:');
        for (const user of usernames) {
          console.log(` - ${user}`);
        }
      }
      break;
    }

    case 'init-defaults': {
      const defaultUsers = ['mohammed', 'aadi', 'qa', 'support'];
      const users = readHtpasswd();

      console.log('Initializing default team accounts...');
      for (const username of defaultUsers) {
        if (users[username]) {
          console.log(`User "${username}" already exists. Skipping.`);
        } else {
          // Generate a secure temporary password
          const tempPassword =
            Math.random().toString(36).substring(2, 10) +
            '!' +
            Math.random().toString(36).substring(2, 6).toUpperCase();
          const salt = bcrypt.genSaltSync(10);
          const hash = bcrypt.hashSync(tempPassword, salt);
          users[username] = hash;
          console.log(`Created user: "${username}" with temporary password: "${tempPassword}"`);
        }
      }
      writeHtpasswd(users);
      console.log(
        '\nDefault accounts generated. Make sure to share passwords securely and ask team members to change them.',
      );
      break;
    }

    default: {
      console.error(`Unknown command: "${command}"`);
      showUsage();
      process.exit(1);
    }
  }
}

main();
