const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src', 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Fix missing async on router handlers (e.g., router.get('/...', (_req, res) => ...))
  content = content.replace(/router\.(get|post|put|delete)\(([^,]+),\s*(?!\s*async)(_req|req):\s*Request(?:<[^>]+>)?,\s*res:\s*Response\)\s*=>/g, 
    "router.$1($2, async ($3: Request, res: Response) =>");
  content = content.replace(/router\.(get|post|put|delete)\(([^,]+),\s*(?!\s*async)\((_req|req),\s*res\)\s*=>/g, 
    "router.$1($2, async ($3, res) =>");
  content = content.replace(/router\.(get|post|put|delete)\(([^,]+),\s*(?!\s*async)\((_req|req):\s*Request,\s*res:\s*Response\)\s*=>/g, 
    "router.$1($2, async ($3: Request, res: Response) =>");

  // Some had (_req: Request, res: Response) without parenthesis around arguments if it was only one arg, but it's two.
  
  // Fix db.prepare(query).all(...params) where query is a variable
  content = content.replace(/db\.prepare\((.*?)\)\.all\(\.\.\.params\)/g, "await db.all($1, params)");
  content = content.replace(/db\.prepare\((.*?)\)\.all\((.*?)\)/g, (match, sql, args) => {
    return args.trim() ? `await db.all(${sql}, [${args}])` : `await db.all(${sql})`;
  });

  content = content.replace(/db\.prepare\((.*?)\)\.run\((.*?)\)/g, (match, sql, args) => {
    return args.trim() ? `await db.run(${sql}, [${args}])` : `await db.run(${sql})`;
  });

  content = content.replace(/db\.prepare\((.*?)\)\.get\((.*?)\)/g, (match, sql, args) => {
    return args.trim() ? `await db.get(${sql}, [${args}])` : `await db.get(${sql})`;
  });

  // Fix messed up await db.get(X).all(Y) -> await db.all(X, Y)
  content = content.replace(/await\s+db\.get\((.*?)\)\.all\((.*?)\)/gs, (match, sql, args) => {
    return args.trim() ? `await db.all(${sql}, [${args}])` : `await db.all(${sql})`;
  });
  
  content = content.replace(/await\s+db\.run\((.*?)\)\.run\((.*?)\)/gs, (match, sql, args) => {
    return args.trim() ? `await db.run(${sql}, [${args}])` : `await db.run(${sql})`;
  });
  content = content.replace(/await\s+db\.all\((.*?)\)\.run\((.*?)\)/gs, (match, sql, args) => {
    return args.trim() ? `await db.run(${sql}, [${args}])` : `await db.run(${sql})`;
  });

  // some might have tx.prepare
  content = content.replace(/tx\.prepare\((.*?)\)\.all\((.*?)\)/g, (match, sql, args) => {
    return args.trim() ? `await tx.all(${sql}, [${args}])` : `await tx.all(${sql})`;
  });
  content = content.replace(/tx\.prepare\((.*?)\)\.run\((.*?)\)/g, (match, sql, args) => {
    return args.trim() ? `await tx.run(${sql}, [${args}])` : `await tx.run(${sql})`;
  });
  content = content.replace(/tx\.prepare\((.*?)\)\.get\((.*?)\)/g, (match, sql, args) => {
    return args.trim() ? `await tx.get(${sql}, [${args}])` : `await tx.get(${sql})`;
  });

  fs.writeFileSync(filePath, content, 'utf-8');
});

console.log('Fix script executed.');
