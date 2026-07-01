import { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

export default function LabaRugi() {
  const [data, setData] = useState<any>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await axios.get(`/api/dashboard/profit-loss?start_date=${startDate}&end_date=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const exportToExcel = () => {
    if (!data) return;
    const wsData = [
      ['Laporan Laba Rugi Kantinku'],
      [`Periode: ${startDate} s/d ${endDate}`],
      [],
      ['Keterangan', 'Nominal (Rp)'],
      ['Pendapatan / Omzet Kotor', data.revenue],
      ['Harga Pokok Penjualan (HPP)', data.hpp],
      ['Laba Kotor', data.gross_profit],
      ['Biaya Operasional', data.expenses],
      ['Laba Bersih', data.net_profit],
      ['Margin Laba (%)', data.margin.toFixed(2) + '%'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laba Rugi');
    XLSX.writeFile(wb, `Laba_Rugi_${startDate}_to_${endDate}.xlsx`);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>Laporan Laba Rugi</h1>
        <button onClick={exportToExcel} className="btn-primary" style={{ width: 'auto', background: '#10B981' }}>
          ⬇ Export to Excel
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: 'auto', marginBottom: 0 }} />
        <span style={{ padding: '12px 0' }}>s/d</span>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: 'auto', marginBottom: 0 }} />
        <button onClick={fetchData} className="btn-primary" style={{ width: 'auto' }}>Filter</button>
      </div>

      {data ? (
        <div className="table-container" style={{ maxWidth: '600px' }}>
          <table>
            <tbody>
              <tr>
                <td><strong>Pendapatan Kotor</strong></td>
                <td style={{ textAlign: 'right' }}>Rp {data.revenue?.toLocaleString('id-ID')}</td>
              </tr>
              <tr>
                <td><strong>Harga Pokok Penjualan (HPP)</strong></td>
                <td style={{ textAlign: 'right', color: '#EF4444' }}>- Rp {data.hpp?.toLocaleString('id-ID')}</td>
              </tr>
              <tr style={{ background: '#F3F4F6' }}>
                <td><strong>Laba Kotor</strong></td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>Rp {data.gross_profit?.toLocaleString('id-ID')}</td>
              </tr>
              <tr>
                <td><strong>Biaya Operasional</strong></td>
                <td style={{ textAlign: 'right', color: '#EF4444' }}>- Rp {data.expenses?.toLocaleString('id-ID')}</td>
              </tr>
              <tr style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                <td style={{ color: '#047857' }}><strong>Laba Bersih</strong></td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#047857', fontSize: '18px' }}>
                  Rp {data.net_profit?.toLocaleString('id-ID')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div>Loading data...</div>
      )}
    </div>
  );
}
