import { useEffect, useState } from 'react';
import axios from 'axios';
import { TrendingUp, ShoppingBag, Users, Package, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';

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

  const token = localStorage.getItem('admin_token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, txRes] = await Promise.all([
          axios.get('/api/dashboard/summary', { headers }).catch(() => ({ data: {} })),
          axios.get('/api/transactions?limit=7', { headers }).catch(() => ({ data: [] })),
        ]);
        setStats(dashRes.data);
        setRecentTx(Array.isArray(txRes.data) ? txRes.data.slice(0, 7) : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
          <div className="page-title">Selamat Datang! 👋</div>
          <div className="page-subtitle">Ringkasan aktivitas toko Anda hari ini</div>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          icon={<TrendingUp size={22} color="#F97316" />}
          label="Pendapatan Hari Ini"
          value={fmt(stats?.today_revenue ?? 0)}
          color="indigo"
        />
        <StatCard
          icon={<ShoppingBag size={22} color="#F59E0B" />}
          label="Transaksi Hari Ini"
          value={stats?.today_transactions ?? 0}
          sub="pesanan selesai"
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
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Clock size={17} color="var(--primary)" />
            Transaksi Terbaru
          </div>
          <span className="badge badge-blue">{recentTx.length} transaksi</span>
        </div>
        {recentTx.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🧾</div>
            <h3>Belum ada transaksi</h3>
            <p>Transaksi akan muncul setelah kasir mulai melayani pelanggan</p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>No. Struk</th>
                  <th>Tanggal</th>
                  <th>Pelanggan</th>
                  <th>Pembayaran</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTx.map((tx: any) => (
                  <tr key={tx.id}>
                    <td><span style={{ fontWeight: 600, color: 'var(--primary)' }}>#{tx.receipt_number}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {new Date(tx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>{tx.customer_name || <span style={{ color: 'var(--text-muted)' }}>Umum</span>}</td>
                    <td>
                      <span className={`badge ${tx.payment_method === 'cash' ? 'badge-green' : 'badge-blue'}`}>
                        {tx.payment_method === 'cash' ? '💵 Tunai' : tx.payment_method === 'qris' ? '📱 QRIS' : tx.payment_method || '-'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{fmt(tx.grand_total)}</td>
                    <td>
                      <span className={`badge ${tx.is_void ? 'badge-red' : 'badge-green'}`}>
                        {tx.is_void ? 'Void' : 'Selesai'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
