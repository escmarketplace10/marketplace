import React from 'react';

/**
 * Menangkap error saat render supaya aplikasi TIDAK berubah jadi layar blank
 * (putih total tanpa pesan). Tanpa ini, satu error render kecil — mis. mencoba
 * menampilkan objek error {code, message} sebagai teks (React error #31) —
 * membuat seluruh halaman admin kosong dan sulit didiagnosis.
 */
interface State { error: Error | null; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('UI crash tertangkap ErrorBoundary:', error, info);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, background: '#F8FAFC', fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{
            maxWidth: 460, width: '100%', background: 'white', borderRadius: 12,
            padding: 28, boxShadow: '0 8px 30px rgba(0,0,0,0.08)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, color: '#0F172A' }}>Terjadi kesalahan tampilan</h2>
            <p style={{ margin: '0 0 16px', fontSize: 13.5, color: '#64748B', lineHeight: 1.55 }}>
              Halaman gagal ditampilkan. Coba muat ulang. Bila masih terjadi, hubungi
              pengelola sistem dengan menyertakan pesan di bawah.
            </p>
            <pre style={{
              textAlign: 'left', fontSize: 12, color: '#B91C1C', background: '#FEF2F2',
              border: '1px solid #FEE2E2', borderRadius: 8, padding: 12, margin: '0 0 16px',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 160, overflow: 'auto',
            }}>
              {String(this.state.error?.message || this.state.error)}
            </pre>
            <button
              onClick={this.handleReload}
              style={{
                background: '#4F46E5', color: 'white', border: 'none', borderRadius: 8,
                padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
