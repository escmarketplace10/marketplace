import bcrypt from 'bcryptjs';
import sha256 from 'sha256';

export async function matchesPin(input: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  if (stored.startsWith('$2')) return bcrypt.compare(input, stored);
  return stored === sha256(input);
}

export async function pinUsedByAnother(db: { all: (sql: string, params?: any[]) => Promise<any[]> }, pin: string, exceptId = ''): Promise<boolean> {
  const employees = await db.all('SELECT id, pin FROM employees WHERE pin IS NOT NULL AND id != ?', [exceptId]);
  for (const employee of employees) {
    if (await matchesPin(pin, employee.pin)) return true;
  }
  return false;
}
