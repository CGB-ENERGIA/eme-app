import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Formulario from './pages/Formulario'
import Solicitacoes from './pages/Solicitacoes'
import { ThemeProvider } from './contexts/ThemeContext'
import { SidebarProvider } from './contexts/SidebarContext'
import InstallPrompt from './components/ui/InstallPrompt'

export default function App() {
  return (
    <ThemeProvider>
      <SidebarProvider>
      <BrowserRouter>
        <Routes>
          {/* PWA inicial: apenas Solicitações. Formulário permanece acessível via link. */}
          <Route path="/" element={<Solicitacoes />} />
          <Route path="/solicitacoes" element={<Navigate to="/" replace />} />
          <Route path="/formulario/:id" element={<Formulario />} />
          <Route path="/formularios" element={<Navigate to="/" replace />} />
          <Route path="/acionamento" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <InstallPrompt />
      </BrowserRouter>
      </SidebarProvider>
    </ThemeProvider>
  )
}
