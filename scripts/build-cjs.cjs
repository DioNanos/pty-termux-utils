/**
 * Build CommonJS (.cjs) files from ES modules (.js)
 * Converts ESM exports to CommonJS exports
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist');
const files = fs.readdirSync(distDir).filter(f => f.endsWith('.js') && !f.endsWith('.cjs'));

console.log(`Building .cjs files from ${files.length} source files...`);

files.forEach(file => {
  const jsPath = path.join(distDir, file);
  const cjsPath = path.join(distDir, file.replace('.js', '.cjs'));
  
  let content = fs.readFileSync(jsPath, 'utf8');
  
  // Convert ESM exports to CJS
  content = content
    // Replace "export const" with "module.exports."
    .replace(/export const (\w+)/g, 'module.exports.$1 =')
    // Replace "export function" with "module.exports."
    .replace(/export function (\w+)/g, 'module.exports.$1 = function')
    // Replace "export class" with "module.exports."
    .replace(/export class (\w+)/g, 'module.exports.$1 = class')
    // Replace "export *" with re-exports
    .replace(/export \* from '(\.\/\w+)';/g, (match, importPath) => {
      return `Object.assign(module.exports, require('${importPath}'));`;
    })
    // Replace "export {" with module.exports
    .replace(/export \{ ([^}]+) \} from '(\.\/\w+)';/g, (match, exports, importPath) => {
      const exportList = exports.split(',').map(e => e.trim());
      return exportList.map(e => `module.exports.${e} = require('${importPath}').${e}`).join(';\n');
    });
  
  // Add node module wrapper at the top if needed
  if (!content.startsWith("'use strict'") && !content.startsWith('"use strict"')) {
    content = "'use strict';\n" + content;
  }
  
  fs.writeFileSync(cjsPath, content);
  console.log(`  Created ${cjsPath.replace(distDir, 'dist')}`);
});

console.log('\n✓ CJS build complete!');
