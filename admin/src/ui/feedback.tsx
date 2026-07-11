import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

/**
 * Sistem notifikasi & konfirmasi berdesain — pengganti alert()/confirm() bawaan
 * browser yang tampil polos dan tidak sesuai tema.
 *
 * Pemakaian:
 *   toast('Tersimpan', 'success');
 *   toast('Gagal menyimpan', 'error');
 *   const ok = await confirmDialog({ message: 'Hapus item?', danger: true, confirmText: 'Hapus' });
 *
 * <FeedbackHost /> harus dipasang sekali di root (App.tsx).
 */

type ToastType = 'success' | 'error' | 'info';
interface ToastItem { id: number; message: string; type: ToastType; }
interface ConfirmReq {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  danger: boolean;
  resolve: (v: boolean) => void;
}

let toasts: ToastItem[] = [];
let toastListeners: Array<(t: ToastItem[]) => void> = [];
let confirmListener: ((c: ConfirmReq | null) => void) | null = null;
let uid = 1;

function emit() { toastListeners.forEach((l) => l([...toasts])); }

/**
 * Ubah apa pun jadi teks aman untuk dirender React.
 * Backend/axios kadang mengembalikan error berupa objek ({ code, message, ... }),
 * bukan string. Merender objek sebagai child React memicu error #31 (layar blank).
 * Pakai ini di mana pun pesan error API ditampilkan.
 */
export function errText(value: unknown, fallback = 'Terjadi kesalahan.'): string {
  if (value == null) return fallback;
  if (typeof value === 'string') return value || fallback;
  if (typeof value === 'object') {
    const o = value as any;
    return (typeof o.error === 'string' && o.error)
      || (typeof o.message === 'string' && o.message)
      || (typeof o.msg === 'string' && o.msg)
      || fallback;
  }
  return String(value);
}

export function toast(message: unknown, type: ToastType = 'info', durationMs = 4000) {
  const id = uid++;
  toasts.push({ id, message: errText(message, 'Terjadi kesalahan.'), type });
  emit();
  setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); emit(); }, durationMs);
}

export function confirmDialog(opts: {
  title?: string; message: string; confirmText?: string; cancelText?: string; danger?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    if (!confirmListener) { resolve(window.confirm(opts.message)); return; }
    confirmListener({
      title: opts.title || 'Konfirmasi',
      message: opts.message,
      confirmText: opts.confirmText || 'Ya',
      cancelText: opts.cancelText || 'Batal',
      danger: opts.danger ?? false,
      resolve,
    });
  });
}

const TOAST_ICON = { success: CheckCircle2, error: AlertTriangle, info: Info } as const;

export function FeedbackHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [req, setReq] = useState<ConfirmReq | null>(null);

  useEffect(() => {
    const l = (t: ToastItem[]) => setItems(t);
    toastListeners.push(l);
    confirmListener = (c) => setReq(c);
    return () => {
      toastListeners = toastListeners.filter((x) => x !== l);
      confirmListener = null;
    };
  }, []);

  const close = (val: boolean) => { req?.resolve(val); setReq(null); };

  return (
    <>
      <div className="toast-stack">
        {items.map((t) => {
          const Icon = TOAST_ICON[t.type];
          return (
            <div key={t.id} className={`toast toast-${t.type}`}>
              <span className="toast-icon"><Icon size={15} /></span>
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>

      {req && (
        <div className="modal-overlay" onClick={() => close(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{req.title}</div>
              <button className="modal-close" onClick={() => close(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--text-secondary)', margin: 0 }}>
                {req.message}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => close(false)}>{req.cancelText}</button>
              <button className={`btn ${req.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(true)}>
                {req.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
