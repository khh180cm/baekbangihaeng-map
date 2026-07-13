import { Component, type ReactNode } from 'react';

interface State { error: Error | null }

/** 어떤 렌더/이벤트 크래시도 흰 화면 대신 복구 UI를 보여준다. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('App crash:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'system-ui, sans-serif', color: '#2b2118', textAlign: 'center' }}>
          <p style={{ fontSize: 16, marginBottom: 16 }}>화면을 표시하는 중 문제가 발생했어요.</p>
          <button
            style={{ minHeight: 46, padding: '0 20px', fontSize: 16, borderRadius: 10, border: '1px solid #d9c4a3', background: '#fff' }}
            onClick={() => { window.location.reload(); }}
          >
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
