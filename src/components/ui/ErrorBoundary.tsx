import React from 'react';
import { View } from 'react-native';
import { Button, T } from './kit';
import { useColors } from '../../theme';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) return <ErrorFallback error={this.state.error} resetError={this.resetError} />;
    return this.props.children;
  }
}

const ErrorFallback = ({ error, resetError }: { error?: Error; resetError: () => void }) => {
  const c = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', padding: 24, gap: 8 }}>
      <T variant="title2">앗, 화면을 그리지 못했어요</T>
      <T variant="body2" tone="text2">다시 시도해도 안 되면 앱을 껐다가 다시 켜 주세요. 저장한 리스트는 그대로 있어요.</T>
      {__DEV__ && error && <T variant="caption" tone="danger" style={{ marginTop: 8 }}>{error.message}</T>}
      <Button label="다시 시도" onPress={resetError} style={{ marginTop: 16 }} />
    </View>
  );
};
