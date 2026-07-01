const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src', 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace router.<method>('/...', (req, res) => ...) to async
  content = content.replace(/router\.(get|post|put|delete)\(([^,]+),\s*(async\s*)?\((req:\s*Request(?:<[^>]+>)?,\s*res:\s*Response)\)\s*=>/g, 
    "router.$1($2, async ($4) =>");
  
  // also handle some without explicit types if any
  content = content.replace(/router\.(get|post|put|delete)\(([^,]+),\s*(async\s*)?\((req,\s*res)\)\s*=>/g, 
    "router.$1($2, async ($4) =>");

  // db.transaction in SQLite vs our wrapper
  // In our wrapper, db.transaction(async (tx) => { ... })
  // We'll leave transaction replacements for manual if regex gets too hairy, but let's see:
  // db.transaction((...) => { ... }) -> await db.transaction(async (...) => { ... })
  content = content.replace(/const\s+(\w+)\s*=\s*db\.transaction\(\((.*?)\)\s*=>\s*{/g, "const $1 = async ($2) => {");
  content = content.replace(/db\.transaction\(\((.*?)\)\s*=>\s*{/g, "await db.transaction(async ($1) => {");

  // db.prepare(sql).get/all/run
  // db.prepare('...').get(a, b) -> await db.get('...', [a, b])
  content = content.replace(/db\.prepare\(([`'"].*?[`'"])\)\.get\((.*?)\)/gs, (match, sql, args) => {
    return args.trim() ? `await db.get(${sql}, [${args}])` : `await db.get(${sql})`;
  });
  content = content.replace(/db\.prepare\(([`'"].*?[`'"])\)\.all\((.*?)\)/gs, (match, sql, args) => {
    return args.trim() ? `await db.all(${sql}, [${args}])` : `await db.all(${sql})`;
  });
  content = content.replace(/db\.prepare\(([`'"].*?[`'"])\)\.run\((.*?)\)/gs, (match, sql, args) => {
    return args.trim() ? `await db.run(${sql}, [${args}])` : `await db.run(${sql})`;
  });

  // same for tx instead of db
  content = content.replace(/tx\.prepare\(([`'"].*?[`'"])\)\.get\((.*?)\)/gs, (match, sql, args) => {
    return args.trim() ? `await tx.get(${sql}, [${args}])` : `await tx.get(${sql})`;
  });
  content = content.replace(/tx\.prepare\(([`'"].*?[`'"])\)\.all\((.*?)\)/gs, (match, sql, args) => {
    return args.trim() ? `await tx.all(${sql}, [${args}])` : `await tx.all(${sql})`;
  });
  content = content.replace(/tx\.prepare\(([`'"].*?[`'"])\)\.run\((.*?)\)/gs, (match, sql, args) => {
    return args.trim() ? `await tx.run(${sql}, [${args}])` : `await tx.run(${sql})`;
  });
  
  // also some multiline prepares:
  content = content.replace(/db\.prepare\(\s*([`'"][\s\S]*?[`'"])\s*\)\.run\(([\s\S]*?)\)/gs, (match, sql, args) => {
    return args.trim() ? `await db.run(${sql}, [${args}])` : `await db.run(${sql})`;
  });
  content = content.replace(/tx\.prepare\(\s*([`'"][\s\S]*?[`'"])\s*\)\.run\(([\s\S]*?)\)/gs, (match, sql, args) => {
    return args.trim() ? `await tx.run(${sql}, [${args}])` : `await tx.run(${sql})`;
  });
  content = content.replace(/db\.prepare\(\s*([`'"][\s\S]*?[`'"])\s*\)\.get\(([\s\S]*?)\)/gs, (match, sql, args) => {
    return args.trim() ? `await db.get(${sql}, [${args}])` : `await db.get(${sql})`;
  });
  content = content.replace(/tx\.prepare\(\s*([`'"][\s\S]*?[`'"])\s*\)\.get\(([\s\S]*?)\)/gs, (match, sql, args) => {
    return args.trim() ? `await tx.get(${sql}, [${args}])` : `await tx.get(${sql})`;
  });
  content = content.replace(/db\.prepare\(\s*([`'"][\s\S]*?[`'"])\s*\)\.all\(([\s\S]*?)\)/gs, (match, sql, args) => {
    return args.trim() ? `await db.all(${sql}, [${args}])` : `await db.all(${sql})`;
  });
  content = content.replace(/tx\.prepare\(\s*([`'"][\s\S]*?[`'"])\s*\)\.all\(([\s\S]*?)\)/gs, (match, sql, args) => {
    return args.trim() ? `await tx.all(${sql}, [${args}])` : `await tx.all(${sql})`;
  });


  fs.writeFileSync(filePath, content, 'utf-8');
});

console.log('Migration script executed.');
