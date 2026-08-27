import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CRM Uncaught UI Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback({ error: this.state.error, resetError: this.handleReset });
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-white">
          <div className="max-w-md w-full rounded-2xl bg-slate-800 border border-slate-700 p-6 shadow-2xl space-y-4 text-center">
            <div className="h-12 w-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Произошла ошибка интерфейса</h2>
              <p className="text-xs text-slate-400 mt-1">
                Система перехватила сбой компонента, чтобы предотвратить потерю данных.
              </p>
            </div>
            {this.state.error && (
              <div className="text-left bg-slate-950/80 p-3 rounded-xl border border-slate-700 text-[11px] font-mono text-rose-300 max-h-36 overflow-y-auto">
                {this.state.error.toString()}
              </div>
            )}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-slate-700 text-xs font-bold text-white hover:bg-slate-600 transition cursor-pointer"
              >
                Попробовать снова
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 shadow-md transition cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Перезагрузить страницу</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
