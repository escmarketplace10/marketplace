import { useEffect, useState } from 'react';
import axios from 'axios';
import { TrendingUp, ShoppingBag, Users, Package, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { hasPerm } from '../lib/perms';
import { paymentMethodLabel, transactionDate, transactionStatus, transactionTitle } from '../lib/transactionDisplay';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

function StatCard({ icon, label, value, sub, color, trend }: any) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-card-header">
        <div className={`stat-card-icon ${color}`}>{icon}</div>
        {trend !== undefined && (
          <span className={`stat-badge ${trend >= 0 ? 'up' : 'down'}`}>
            {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);
  const [transactionsError, setTransactionsError] = useState(false);
  const canSeeTransactions = hasPerm('transactions');

  const token = localStorage.getItem('admin_token');
  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true);
    const [summary, transactions] = await Promise.allSettled([
      axios.get('/api/dashboard/summary', { headers }),
      canSeeTransactions ? axios.get('/api/transactions?limit=7', { headers }) : Promise.resolve(null),
    ]);
    if (summary.status === 'fulfilled') {
      setStats(summary.value.data);
      setSummaryError(false);
    } else {
      setStats(null);
      setSummaryError(true);
    }
    if (canSeeTransactions) {
      if (transactions.status === 'fulfilled' && transactions.value && Array.isArray(transactions.value.data)) {
        setRecentTx(transactions.value.data);
        setTransactionsError(false);
      } else {
        setRecentTx([]);
        setTransactionsError(true);
      }
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
        <span>Memuat data dashboard...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Ringkasan Toko</div>
          <div className="page-subtitle">Penjualan dihitung setelah pembayaran dikonfirmasi kasir.</div>
        </div>
      </div>

      {summaryError ? <div className="card" role="alert"><div className="card-body">Ringkasan belum dapat dimuat. <button className="btn btn-secondary btn-sm" onClick={load}>Coba lagi</button></div></div> : <div className="stats-grid">
        <StatCard
          icon={<TrendingUp size={22} color="#F97316" />}
          label="Pendapatan Hari Ini"
          value={fmt(stats?.today_revenue ?? 0)}
          color="indigo"
        />
        <StatCard
          icon={<ShoppingBag size={22} color="#F59E0B" />}
          label="Sudah Bayar Hari Ini"
          value={stats?.today_transactions ?? 0}
          sub="tidak termasuk Void"
          color="amber"
        />
        <StatCard
          icon={<Users size={22} color="#10B981" />}
          label="Total Pelanggan"
          value={stats?.total_customers ?? 0}
          color="green"
        />
        <StatCard
          icon={<Package size={22} color="#EF4444" />}
          label="Produk Stok Rendah"
          value={stats?.low_stock_count ?? 0}
          sub="perlu restock"
          color="rose"
        />
      </div>}

      {canSeeTransactions && <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Clock size={17} color="var(--primary)" />
            Transaksi Terbaru
          </div>
          <Link className="btn btn-secondary btn-sm" to="/transactions">Lihat semua</Link>
        </div>
        {transactionsError ? <div className="card-body" role="alert">Daftar transaksi belum dapat dimuat. <button className="btn btn-secondary btn-sm" onClick={load}>Coba lagi</button></div> : recentTx.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🧾</div>
            <h3>Belum ada transaksi</h3>
            <p>Pesanan baru akan muncul di sini.</p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Transaksi / Struk</th>
                  <th>Tanggal</th>
                  <th>Dibuat oleh</th>
                  <th>Pelanggan</th>
                  <th>Pembayaran</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTx.map((tx: any) => (
                  <tr key={tx.id}>
                    <td><Link to={`/transactions?search=${encodeURIComponent(tx.receipt_number)}`} style={{ fontWeight: 600 }}>{transactionTitle(tx)}</Link><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>#{tx.receipt_number}</div></td>
                    <td style={{ color: 'var(--text-muted)' }}>{transactionDate(tx.created_at)}</td>
                    <td>{tx.employee_name || '—'}</td>
                    <td>{tx.customer_name || <span style={{ color: 'var(--text-muted)' }}>Umum</span>}</td>
                    <td>{paymentMethodLabel(tx)}</td>
                    <td style={{ fontWeight: 700 }}>{fmt(tx.grand_total)}</td>
                    <td>
                      <span className={`badge ${transactionStatus(tx).badge}`}>
                        {transactionStatus(tx).label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>}
    </div>
  );
}
