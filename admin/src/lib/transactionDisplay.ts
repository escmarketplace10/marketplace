type TransactionStatus = { label: string; badge: string };

export function transactionStatus(tx: { is_void?: number | boolean; payment_status?: string }): TransactionStatus {
  if (Boolean(tx.is_void)) return { label: 'Void', badge: 'badge-red' };
  if (tx.payment_status === 'completed') return { label: 'Sudah bayar', badge: 'badge-green' };
  return { label: 'Belum dibayar', badge: 'badge-yellow' };
}

const paymentNames: Record<string, string> = {
  cash: 'Tunai', qris: 'QRIS', card: 'Kartu', ewallet: 'E-Wallet',
};

export function paymentMethodLabel(tx: { payment_status?: string; payment_method?: string | null }): string {
  if (tx.payment_status !== 'completed') return '—';
  return paymentNames[tx.payment_method || ''] || tx.payment_method || '—';
}

export function transactionTitle(tx: { transaction_name?: string | null; receipt_number?: string | null }): string {
  return tx.transaction_name?.trim() || tx.receipt_number || 'Tanpa nama';
}

export function transactionDate(value: string): string {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
