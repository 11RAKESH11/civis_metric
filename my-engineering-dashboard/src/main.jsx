import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { UnitProvider } from './context/UnitContext.jsx'
import { ProjectProvider } from './context/ProjectContext.jsx'
import { CadProvider } from './context/CadContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UnitProvider>
      <ProjectProvider>
        <CadProvider>
          <App />
        </CadProvider>
      </ProjectProvider>
    </UnitProvider>
  </StrictMode>,
)
