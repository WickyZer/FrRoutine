import { Component, type ErrorInfo, type ReactNode } from "react";
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {}
  render() {
    if (this.state.failed)
      return (
        <main className="app-recovery">
          <img src="/brand/wordmark.webp" alt="FrRoutine" width="220" />
          <h1>Ruang Anda belum dapat dimuat.</h1>
          <p>
            Muat ulang halaman untuk mencoba kembali. Data akun Anda tetap
            tersimpan.
          </p>
          <button className="primary" onClick={() => window.location.reload()}>
            Muat ulang
          </button>
        </main>
      );
    return this.props.children;
  }
}
