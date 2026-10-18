import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyInterfacePreferences } from './features/settings/InterfaceSettingsTab'
try { applyInterfacePreferences() } catch (error) { console.warn('Interface preferences unavailable; using defaults') }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
