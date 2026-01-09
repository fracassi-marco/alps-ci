#!/usr/bin/env bun

/**
 * Generate a secure random secret for BETTER_AUTH_SECRET
 * Run: bun run scripts/generate-auth-secret.ts
 */

const crypto = require('crypto');

const secret = crypto.randomBytes(32).toString('base64');

console.log('Generated BETTER_AUTH_SECRET:');
console.log('');
console.log(secret);
console.log('');
console.log('Add this to your .env.local file:');
console.log(`BETTER_AUTH_SECRET=${secret}`);

