import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[smoke] render error', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-fallback">
          <p>Ошибка отображения</p>
          <button type="button" onClick={() => this.setState({ error: null })}>
            Повторить
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
