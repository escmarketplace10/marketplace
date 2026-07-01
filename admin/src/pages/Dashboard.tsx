import { useEffect, useState } from 'react';
import axios from 'axios';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    axios.get('/api/dashboard/summary', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setData(res.data))
    .catch(console.error);
  }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Dashboard Ringkasan</h1>
      
      <div className="card-grid">
        <div className="card">
          <h3>Total Penjualan Hari Ini</h3>
          <p className="value">Rp {data.sales[0]?.total_sales?.toLocaleString('id-ID')}</p>
        </div>
        <div className="card">
          <h3>Total Transaksi</h3>
          <p className="value">{data.sales[0]?.transaction_count}</p>
        </div>
        <div className="card">
          <h3>Peringatan Stok Tipis</h3>
          <p className="value" style={{ color: data.alerts.low_stock > 0 ? '#EF4444' : 'inherit' }}>
            {data.alerts.low_stock} Produk
          </p>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Produk Terlaris Hari Ini</th>
              <th>Terjual</th>
              <th>Omzet</th>
            </tr>
          </thead>
          <tbody>
            {data.topProducts ? (
              <tr>
                <td>{data.topProducts.product_name}</td>
                <td>{data.topProducts.qty}</td>
                <td>Rp {data.topProducts.total?.toLocaleString('id-ID')}</td>
              </tr>
            ) : (
              <tr><td colSpan={3} style={{ textAlign: 'center' }}>Belum ada penjualan hari ini</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
