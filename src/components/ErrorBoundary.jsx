import { Component } from 'react';
import { Button, Result } from 'antd';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Result
            status="error"
            title="頁面發生錯誤"
            subTitle={this.state.error?.message ?? '請重新整理後再試'}
            extra={<Button type="primary" onClick={() => window.location.reload()}>重新整理</Button>}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
