import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Lista from './pages/Lista'
import Formulario from './pages/Formulario'
import Acionamento from './pages/Acionamento'
import Solicitacoes from './pages/Solicitacoes'
import { ThemeProvider } from './contexts/ThemeContext'
import { SidebarProvider } from './contexts/SidebarContext'
import InstallPrompt from './components/ui/InstallPrompt'
import DesktopOnly from './components/routing/DesktopOnly'

export default function App() {
  return (
    <ThemeProvider>
      <SidebarProvider>
      <BrowserRouter>
        <Routes>
          {/* Página geral (desktop): Formulários + Acionamento + Solicitações no menu */}
          <Route path="/" element={<DesktopOnly><Lista /></DesktopOnly>} />
          <Route path="/acionamento" element={<DesktopOnly><Acionamento /></DesktopOnly>} />

          {/* PWA / celular / tablet: Solicitações (+ formulário via link) */}
          <Route path="/solicitacoes" element={<Solicitacoes />} />
          <Route path="/formulario/:id" element={<Formulario />} />
        </Routes>
        <InstallPrompt />
      </BrowserRouter>
      </SidebarProvider>
    </ThemeProvider>
  )
}
