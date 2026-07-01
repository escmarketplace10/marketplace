const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src', 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Fix: await db.run('...').run(a, b) -> await db.run('...', [a, b])
  content = content.replace(/await\s+db\.run\(([`'"].*?[`'"])\)\s*\.\s*run\(([\s\S]*?)\)/g, (match, sql, args) => {
    return `await db.run(${sql}, [${args}])`;
  });

  // Fix: db.prepare('...').run(a, b) -> await db.run('...', [a, b])
  content = content.replace(/db\.prepare\(([`'"][\s\S]*?[`'"])\)\s*\.\s*run\(([\s\S]*?)\)/g, (match, sql, args) => {
    return `await db.run(${sql}, [${args}])`;
  });
  
  // Fix: db.prepare('...', [...]) as any (if missing .get)
  content = content.replace(/db\.prepare\(([`'"].*?[`'"]),\s*(\[.*?\])\)\s*as\s*any/g, (match, sql, args) => {
    // If it's a SELECT with COUNT, it's usually get
    if (sql.toLowerCase().includes("count(")) {
      return `await db.get(${sql}, ${args}) as any`;
    }
    return `await db.all(${sql}, ${args}) as any`;
  });

  // Fix: db.prepare('...', [...])
  content = content.replace(/db\.prepare\(([`'"].*?[`'"]),\s*(\[.*?\])\)/g, (match, sql, args) => {
    if (sql.toLowerCase().includes("select")) {
       if (sql.toLowerCase().includes("count(")) return `await db.get(${sql}, ${args})`;
       return `await db.all(${sql}, ${args})`;
    }
    return `await db.run(${sql}, ${args})`;
  });

  // Fix: db.prepare('...', ...)
  content = content.replace(/db\.prepare\(([`'"].*?[`'"]),\s*(req\.params.*?)\)/g, (match, sql, args) => {
    if (sql.toLowerCase().includes("select")) {
       if (sql.toLowerCase().includes("count(")) return `await db.get(${sql}, [${args}])`;
       return `await db.all(${sql}, [${args}])`;
    }
    return `await db.run(${sql}, [${args}])`;
  });

  // Missing async
  content = content.replace(/router\.(get|post|put|delete)\(([^,]+),\s*\((req|_req|res|_res)/g, "router.$1($2, async ($3");

  fs.writeFileSync(filePath, content, 'utf-8');
});

console.log('Fix2 script executed.');
