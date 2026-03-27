import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = this.state.error?.message || 'Bilinmeyen bir hata oluştu.';
      try {
        const parsed = JSON.parse(errorMessage);
        if (parsed.error) {
          errorMessage = parsed.error;
        }
      } catch (e) {
        // Not JSON
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-red-100">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Bir Hata Oluştu</h2>
            <p className="text-gray-700 mb-4">
              Uygulama çalışırken beklenmeyen bir hata meydana geldi.
            </p>
            <div className="bg-red-50 p-4 rounded-md text-sm text-red-800 break-words mb-6">
              {errorMessage}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
