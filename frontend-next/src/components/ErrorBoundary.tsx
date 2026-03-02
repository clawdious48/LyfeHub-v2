import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught render error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-bg-app gap-4">
          <h1 className="text-lg font-heading text-text-primary">Something went wrong</h1>
          <p className="text-sm text-text-secondary max-w-md text-center">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            className="px-4 py-2 text-sm rounded-md bg-accent text-white hover:opacity-90"
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.href = '/'
            }}
          >
            Return to Dashboard
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
