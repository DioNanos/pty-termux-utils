/**
 * Build CommonJS (.cjs) files from ES modules (.js)
 * Lightweight transform tailored to our small, consistent output.
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist');
const files = fs.readdirSync(distDir).filter(f => f.endsWith('.js') && !f.endsWith('.cjs'));

const rewriteSpec = (spec) => {
  if (spec.startsWith('.') && spec.endsWith('.js')) {
    return spec.replace(/\.js$/, '.cjs');
  }
  return spec;
};

const parseExportList = (list) => {
  return list
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      const parts = item.split(/\s+as\s+/).map(p => p.trim());
      return { local: parts[0], exported: parts[1] || parts[0] };
    });
};

const transform = (content) => {
  const exported = [];
  let out = content;

  // Side-effect imports
  out = out.replace(/import\s+['"]([^'"]+)['"];?/g, (match, spec) => {
    return `require('${rewriteSpec(spec)}');`;
  });

  // Named imports: import { a, b } from './x.js'
  out = out.replace(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?/g, (match, imports, spec) => {
    return `const {${imports}} = require('${rewriteSpec(spec)}');`;
  });

  // Namespace imports: import * as foo from './x.js'
  out = out.replace(/import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"];?/g, (match, name, spec) => {
    return `const ${name} = require('${rewriteSpec(spec)}');`;
  });

  // Default imports: import foo from './x.js'
  out = out.replace(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"];?/g, (match, name, spec) => {
    return `const ${name} = require('${rewriteSpec(spec)}');`;
  });

  // Re-exports: export * from './x.js'
  out = out.replace(/export\s+\*\s+from\s+['"]([^'"]+)['"];?/g, (match, spec) => {
    return `Object.assign(exports, require('${rewriteSpec(spec)}'));`;
  });

  // Re-exports: export { a, b as c } from './x.js'
  out = out.replace(/export\s+\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"];?/g, (match, list, spec) => {
    const exportsList = parseExportList(list);
    const target = rewriteSpec(spec);
    return exportsList
      .map(({ local, exported }) => `exports.${exported} = require('${target}').${local};`)
      .join('\n');
  });

  // Remove empty export block (e.g. "export {};")
  out = out.replace(/export\s+\{\s*\}\s*;?/g, '');

  // Export declarations -> strip "export", track names
  out = out.replace(/export\s+(const|let|var)\s+(\w+)/g, (match, kind, name) => {
    exported.push({ local: name, exported: name });
    return `${kind} ${name}`;
  });

  out = out.replace(/export\s+function\s+(\w+)/g, (match, name) => {
    exported.push({ local: name, exported: name });
    return `function ${name}`;
  });

  out = out.replace(/export\s+class\s+(\w+)/g, (match, name) => {
    exported.push({ local: name, exported: name });
    return `class ${name}`;
  });

  // Export list: export { a, b as c }
  out = out.replace(/export\s+\{\s*([^}]+)\s*\}\s*;?/g, (match, list) => {
    parseExportList(list).forEach(entry => exported.push(entry));
    return '';
  });

  // Export default (not used, but handle safely)
  out = out.replace(/export\s+default\s+/g, 'module.exports = ');

  if (exported.length > 0) {
    const lines = exported.map(({ local, exported: name }) => `exports.${name} = ${local};`);
    out = `${out}\n${lines.join('\n')}\n`;
  }

  if (!out.startsWith("'use strict'") && !out.startsWith('"use strict"')) {
    out = "'use strict';\n" + out;
  }

  return out;
};

console.log(`Building .cjs files from ${files.length} source files...`);

files.forEach(file => {
  const jsPath = path.join(distDir, file);
  const cjsPath = path.join(distDir, file.replace('.js', '.cjs'));

  const content = fs.readFileSync(jsPath, 'utf8');
  const transformed = transform(content);

  fs.writeFileSync(cjsPath, transformed);
  console.log(`  Created ${cjsPath.replace(distDir, 'dist')}`);
});

console.log('\n✓ CJS build complete!');
