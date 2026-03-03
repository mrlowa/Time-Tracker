import React from 'react'
import './index.css'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <Layout />
    </ErrorBoundary>
  )
}

export default App
