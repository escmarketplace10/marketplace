const fs = require('fs');
const path = require('path');

function fixFile(file, replacer) {
  const filePath = path.join(__dirname, 'src', 'routes', file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  content = replacer(content);
  fs.writeFileSync(filePath, content, 'utf-8');
}

fixFile('consignors.ts', c => {
  c = c.replace(/\(\s*req:\s*Request,\s*res:\s*Response\s*\)\s*=>/g, "async (req: Request, res: Response) =>");
  c = c.replace(/\(\s*_req:\s*Request,\s*res:\s*Response\s*\)\s*=>/g, "async (_req: Request, res: Response) =>");
  c = c.replace(/async\s+async/g, "async"); // Just in case we duplicated it

  // Fix line 95 and 131 db.prepare(..., [...])
  c = c.replace(/db\.prepare\(([`'"][\s\S]*?[`'"]),\s*(\[.*?\])\)\s*as\s*any/g, "await db.get($1, $2) as any");
  c = c.replace(/db\.prepare\(([`'"][\s\S]*?[`'"]),\s*(\[.*?\])\)/g, "await db.run($1, $2)");
  
  return c;
});

fixFile('crm.ts', c => {
  c = c.replace(/db\.prepare\(/g, "await db.all(");
  return c;
});

fixFile('dashboard.ts', c => {
  c = c.replace(/db\.prepare\(/g, "await db.all(");
  return c;
});

fixFile('employees.ts', c => {
  c = c.replace(/await\s+db\.get\('INSERT(.*?)\)\s*\.\s*run\((.*?)\)/gs, "await db.run('INSERT$1, [$2])");
  c = c.replace(/db\.prepare\(/g, "await db.run(");
  return c;
});

fixFile('products.ts', c => {
  c = c.replace(/db\.prepare\(/g, "await db.run(");
  return c;
});

fixFile('purchase-orders.ts', c => {
  c = c.replace(/await\s+db\.all\('INSERT(.*?)\)\s*\.\s*run\((.*?)\)/gs, "await db.run('INSERT$1, [$2])");
  return c;
});

fixFile('shifts.ts', c => {
  c = c.replace(/await\s+db\.get\('INSERT(.*?)\)\s*\.\s*run\((.*?)\)/gs, "await db.run('INSERT$1, [$2])");
  return c;
});

fixFile('suppliers.ts', c => {
  c = c.replace(/db\.prepare\(/g, "await db.run(");
  return c;
});

fixFile('sync.ts', c => {
  c = c.replace(/db\.prepare\((.*?)\)\s*as\s*any;/g, "await db.get($1) as any;");
  return c;
});

console.log('Fix3 script executed.');
