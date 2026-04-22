import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backgroundColor: '#F8F9FA',
          textAlign: 'center',
          fontFamily: 'sans-serif'
        }}>
          <div style={{
            background: '#FFEBEB',
            padding: '20px',
            borderRadius: '50%',
            marginBottom: '24px'
          }}>
            <ShieldAlert size={48} color="#D32F2F" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#212529', marginBottom: '12px' }}>
            문제가 발생했습니다
          </h2>
          <p style={{ color: '#666', marginBottom: '32px', lineHeight: '1.6' }}>
            애플리케이션 실행 중 예기치 못한 에러가 발생했습니다.<br />
            아래 버튼을 눌러 페이지를 새로고침해 주세요.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: '#1A73E8',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(26, 115, 232, 0.2)'
            }}
          >
            <RefreshCw size={18} /> 새로고침하기
          </button>
          {import.meta.env.DEV && (
            <div style={{
              marginTop: '40px',
              padding: '16px',
              background: '#EEE',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#444',
              maxWidth: '100%',
              overflowX: 'auto',
              textAlign: 'left'
            }}>
              <strong>Error Details:</strong> {this.state.error?.message}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
