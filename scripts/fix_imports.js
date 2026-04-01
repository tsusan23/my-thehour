const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  const result = execSync('grep -rl "from \'@/app/api/auth/\\[...nextauth\\]/route\'" src').toString().trim();
  if (!result) process.exit(0);

  const files = result.split('\n');
  for (const file of files) {
    if (!file) continue;
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/from '@\/app\/api\/auth\/\[\.\.\.nextauth\]\/route'/g, "from '@/lib/auth'");
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
} catch (e) {
  // grep returns error if no files found, swallow it.
  console.log('No more files to fix.');
}
