import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyInterfacePreferences } from './features/settings/InterfaceSettingsTab'
import { startAppUpdates } from './appUpdates'
try { applyInterfacePreferences() } catch { console.warn('Interface preferences unavailable; using defaults') }
startAppUpdates()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
