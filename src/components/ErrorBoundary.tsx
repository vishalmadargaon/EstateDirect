import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected interface error occurred.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('EstateDirect ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF7F2] text-[#17120F] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-[28px] border border-[#17120F]/10 p-8 shadow-editorial text-center">
            <div className="w-12 h-12 rounded-xl bg-white border border-[#17120F]/12 overflow-hidden flex items-center justify-center mx-auto mb-5">
              <img
                src="/assets/aistudio/Gemini_Generated_Image_e7l37be7l37be7l3_741afc4d.png"
                alt="EstateDirect"
                className="w-10 h-10 object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">Something went wrong</h1>
            <p className="text-sm text-[#17120F]/70 mb-6 break-words">{this.state.message}</p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.hash = '#/';
              }}
              className="px-6 py-3 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-semibold hover:bg-[#261E19] transition-colors cursor-pointer"
            >
              Return to EstateDirect
            </button>
            <p className="mt-5 text-xs text-[#17120F]/55">
              Need assistance? Email{' '}
              <a
                href="mailto:estatedirect@zohomail.in"
                className="font-semibold text-[#17120F] underline"
              >
                estatedirect@zohomail.in
              </a>
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
