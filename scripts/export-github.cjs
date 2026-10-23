const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = path.join(root, 'artifacts', `github-ready-${stamp}`);
const entries = ['README.md', 'package.json', '.gitignore', '.editorconfig', '.github', 'Data Pool', 'database', 'website', 'docs', 'scripts', 'skills'];
fs.mkdirSync(target, { recursive: true });
for (const entry of entries) {
  fs.cpSync(path.join(root, entry), path.join(target, entry), {
    recursive: true,
    filter(source) {
      const parts = path.relative(root, source).split(path.sep);
      return !parts.some(part => ['.git', '.sites-runtime', 'node_modules'].includes(part))
        && !(parts.includes('.openai') && path.basename(source) === 'hosting.json');
    }
  });
}
console.log(`GitHub 專案已匯出：${target}`);
