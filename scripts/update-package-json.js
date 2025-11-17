import fs from 'fs';
import path from 'path';

const packageJsonPath = path.join(process.cwd(), 'package.json');

// Read current package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Update scripts section
packageJson.scripts = {
  ...packageJson.scripts,
  "test:routes": "jest tests/route-verification-test.js",
  "dev:monitor": "nodemon server.js",
  "start:prod": "NODE_ENV=production node server.js",
  "debug:routes": "node -e \"import('./server.js').then(app => { console.log('Server imported successfully') })\""
};

// Write updated package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log('✅ Updated package.json with new scripts');
