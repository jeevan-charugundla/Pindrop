import { useEffect, useState } from 'react'
import './App.css'

type PageState = {
  active: boolean
  count: number
}

function App() {
  const [enabled, setEnabled] = useState(false)
  const [count, setCount] = useState(0)
  const [status, setStatus] = useState('Ready to annotate')
  const [busy, setBusy] = useState(false)

  async function getActiveTab() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    })

    if (!tab.id || !tab.url?.startsWith('http')) {
      setStatus('Open a normal website first.')
      return null
    }
    return tab
  }

  async function sendState(tabId: number) {
    try {
      const state = await chrome.tabs.sendMessage(tabId, { action: 'getState' }) as PageState
      setEnabled(state.active)
      setCount(state.count)
    } catch {
      setEnabled(false)
      setCount(0)
    }
  }

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab.id && tab.url?.startsWith('http')) sendState(tab.id)
    }).catch(() => setStatus('Could not read the current page.'))
  }, [])

  async function toggleAnnotation() {
    setBusy(true)
    try {
      const tab = await getActiveTab()
      if (!tab?.id) return

      if (!enabled) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js'],
        })
        const state = await chrome.tabs.sendMessage(tab.id, { action: 'start' }) as PageState
        setEnabled(state.active)
        setCount(state.count)
        setStatus('Annotation mode is on')
      } else {
        const state = await chrome.tabs.sendMessage(tab.id, { action: 'stop' }) as PageState
        setEnabled(state.active)
        setCount(state.count)
        setStatus('Annotation mode is off')
      }
    } catch (error) {
      console.error(error)
      setStatus('Could not activate. Reload the webpage and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="popup">
      <header className="brand">
        <div className="logo" aria-hidden="true">P</div>
        <div>
          <h1>PinDrop</h1>
          <p>Leave comments anywhere.</p>
        </div>
      </header>

      <div className="status" aria-live="polite">
        <span className={enabled ? 'dot active' : 'dot'} aria-hidden="true" />
        <span>{status}</span>
        <strong>{count}</strong>
      </div>

      <button
        className="primary-button"
        onClick={toggleAnnotation}
        disabled={busy}
      >
        {busy ? 'Working…' : enabled ? 'Stop annotating' : 'Start annotating'}
      </button>

      <p className="hint">
        {enabled
          ? 'Click any element on the page to place a pin. Press Escape to stop.'
          : 'Choose a webpage and start placing pins.'}
      </p>

      <footer>PinDrop · Private by default</footer>
    </main>
  )
}

export default App
