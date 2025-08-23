#!/usr/bin/env node

const https = require('https');

function getUserById(userId, secretKey) {
  const options = {
    hostname: 'api.clerk.com',
    port: 443,
    path: `/v1/users/${userId}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.error('Usage: node get-user.js <user-id> <secret-key>');
    console.error('Example: node get-user.js user_123abc sk_test_...');
    process.exit(1);
  }

  const [userId, secretKey] = args;

  // Validate secret key format
  if (!secretKey.startsWith('sk_')) {
    console.error('Error: Secret key must start with "sk_"');
    process.exit(1);
  }

  try {
    console.log(`Fetching user: ${userId}`);
    const user = await getUserById(userId, secretKey);
    console.log('\nUser found:');
    console.log(JSON.stringify(user, null, 2));
  } catch (error) {
    console.error('Error fetching user:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
