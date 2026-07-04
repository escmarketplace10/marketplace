import { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { FileDown, TrendingUp, TrendingDown, DollarSign, RefreshCw } from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function LabaRugi() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState({ from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] });
  const token = localStorage.getItem('admin_token');
  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/dashboard/profit-loss?from=${range.from}&to=${range.to}`, { headers });
      setData(res.data);
    } catch {
      setData({ revenue: 0, cogs: 0, gross_profit: 0, expenses: 0, net_profit: 0, consignor_commissions: 0, items: [] });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [range]);

  const exportExcel = () => {
    if (!data) return;
    const summary = [
      ['Laporan Laba Rugi', ''],
      ['Periode', `${range.from} s/d ${range.to}`],
      ['', ''],
      ['PENDAPATAN', ''],
      ['Total Penjualan', data.revenue],
      ['HPP (Harga Pokok)', data.cogs],
      ['Laba Kotor', data.gross_profit],
      ['', ''],
      ['BIAYA & PENGELUARAN', ''],
      ['Biaya Operasional', data.expenses],
      ['Komisi Penitip', data.consignor_commissions ?? 0],
      ['', ''],
      ['LABA BERSIH', data.net_profit],
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Ringkasan');
    if (data.items?.length) {
      const rows = [['No. Struk', 'Tanggal', 'Produk', 'Qty', 'Subtotal', 'HPP', 'Laba']];
      data.items.forEach((it: any, i: number) => {
        rows.push([it.receipt_number || i + 1, it.date || '', it.product_name || '', it.quantity, it.subtotal, it.cogs, it.profit]);
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Detail');
    }
    XLSX.writeFile(wb, `LabaRugi_${range.from}_${range.to}.xlsx`);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Laporan Laba Rugi</div>
          <div className="page-subtitle">Analisis pendapatan, biaya, dan profitabilitas toko</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="btn btn-success" onClick={exportExcel} disabled={!data}>
            <FileDown size={15} /> Export Excel
          </button>
        </div>
      </div>

      {/* Date Filter */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' }}>Periode:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="date"
                className="form-input"
                style={{ width: 'auto' }}
                value={range.from}
                onChange={e => setRange(r => ({ ...r, from: e.target.value }))}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>sampai</span>
              <input
                type="date"
                className="form-input"
                style={{ width: 'auto' }}
                value={range.to}
                onChange={e => setRange(r => ({ ...r, to: e.target.value }))}
              />
            </div>
            {['Hari Ini', 'Minggu Ini', 'Bulan Ini'].map(label => (
              <button key={label} className="btn btn-secondary btn-sm" onClick={() => {
                const today = new Date();
                if (label === 'Hari Ini') setRange({ from: today.toISOString().split('T')[0], to: today.toISOString().split('T')[0] });
                else if (label === 'Minggu Ini') { const mon = new Date(today); mon.setDate(today.getDate() - today.getDay() + 1); setRange({ from: mon.toISOString().split('T')[0], to: today.toISOString().split('T')[0] }); }
                else setRange({ from: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0], to: today.toISOString().split('T')[0] });
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /><span>Menghitung data keuangan...</span></div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 24 }}>
            {[
              { label: 'Total Penjualan', val: data?.revenue ?? 0, icon: <DollarSign size={22} color="#F97316" />, color: 'indigo' },
              { label: 'Harga Pokok (HPP)', val: data?.cogs ?? 0, icon: <TrendingDown size={22} color="#F59E0B" />, color: 'amber' },
              { label: 'Laba Kotor', val: data?.gross_profit ?? 0, icon: <TrendingUp size={22} color="#10B981" />, color: 'green' },
              { label: 'Biaya Operasional', val: data?.expenses ?? 0, icon: <TrendingDown size={22} color="#EF4444" />, color: 'rose' },
              { label: 'Komisi Penitip', val: data?.consignor_commissions ?? 0, icon: <TrendingDown size={22} color="#3B82F6" />, color: 'blue' },
              { label: 'Laba Bersih', val: data?.net_profit ?? 0, icon: <DollarSign size={22} color={(data?.net_profit ?? 0) >= 0 ? '#10B981' : '#EF4444'} />, color: (data?.net_profit ?? 0) >= 0 ? 'green' : 'rose' },
            ].map(({ label, val, icon, color }) => (
              <div key={label} className={`stat-card ${color}`}>
                <div className="stat-card-header">
                  <div className={`stat-card-icon ${color}`}>{icon}</div>
                </div>
                <div className="stat-value" style={{ fontSize: 20 }}>{fmt(val)}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>

          {/* Breakdown Table */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">📊 Ringkasan Laba Rugi</div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Keterangan</th>
                    <th style={{ textAlign: 'right' }}>Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Total Penjualan (Revenue)', val: data?.revenue ?? 0, style: {} },
                    { label: 'Harga Pokok Penjualan (HPP)', val: -(data?.cogs ?? 0), style: { color: 'var(--danger)' } },
                    { label: 'Laba Kotor', val: data?.gross_profit ?? 0, style: { fontWeight: 700, borderTop: '2px solid var(--border)' } },
                    { label: 'Biaya Operasional', val: -(data?.expenses ?? 0), style: { color: 'var(--danger)' } },
                    { label: 'Komisi Penitip', val: -(data?.consignor_commissions ?? 0), style: { color: 'var(--danger)' } },
                    { label: 'LABA BERSIH', val: data?.net_profit ?? 0, style: { fontWeight: 800, fontSize: 15, background: (data?.net_profit ?? 0) >= 0 ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)', borderTop: '2px solid var(--border)' } },
                  ].map(({ label, val, style }) => (
                    <tr key={label}>
                      <td style={style as any}>{label}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: val < 0 ? 'var(--danger)' : val > 0 ? 'var(--success)' : 'var(--text-primary)', ...(style as any) }}>{fmt(Math.abs(val))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
