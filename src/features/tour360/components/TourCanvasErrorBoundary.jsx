import React from 'react';

/** Catches WebGL and texture loading failures without leaving a black viewport. */
export class TourCanvasErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.panoramaUrl !== this.props.panoramaUrl && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950 p-6 text-center text-white">
          <h3 className="text-lg font-semibold">Не удалось открыть панораму 360°</h3>
          <p className="max-w-md text-sm text-slate-300">Проверьте ссылку на изображение, доступ к файлу и поддержку WebGL в браузере.</p>
          <button type="button" onClick={() => this.setState({ error: null })} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold hover:bg-purple-500">Повторить загрузку</button>
        </div>
      );
    }
    return this.props.children;
  }
}
