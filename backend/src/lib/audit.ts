import { Request } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../database';
import { getActorLabel } from '../middleware/actor';

export type AuditAction =
  | 'create' | 'update' | 'delete'
  | 'void' | 'receive' | 'settle'
  | 'login' | 'password_change';

export interface AuditInput {
  action: AuditAction;
  entity: string;            // 'product', 'supplier', 'transaction', ...
  entity_id?: string | null;
  summary?: string;          // ringkasan terbaca manusia
  meta?: Record<string, any>;
  /** Override label aktor (mis. untuk login sebelum req.auth terisi). */
  actorLabel?: string;
  actorKind?: string;
  actorId?: string | null;
}

/**
 * Catat satu baris audit log. Sengaja fire-and-forget & anti-gagal:
 * kegagalan audit TIDAK boleh membatalkan aksi utama (produk tetap tersimpan
 * walau log gagal). Aktor diambil dari JWT (req.auth), bukan dari body klien.
 */
export async function recordAudit(req: Request, input: AuditInput): Promise<void> {
  try {
    const auth = (req as any).auth || (req as any).adminUser || null;
    const db = getDb();
    await db.run(
      `INSERT INTO audit_logs (id, actor_kind, actor_id, actor_label, action, entity, entity_id, summary, meta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuid(),
        input.actorKind ?? auth?.kind ?? 'system',
        input.actorId ?? auth?.id ?? null,
        input.actorLabel ?? getActorLabel(req),
        input.action,
        input.entity,
        input.entity_id ?? null,
        input.summary ?? null,
        input.meta ? JSON.stringify(input.meta) : null,
      ]
    );
  } catch (e) {
    // Jangan pernah melempar — audit bersifat pelengkap.
    console.error('Gagal menulis audit log:', e);
  }
}
