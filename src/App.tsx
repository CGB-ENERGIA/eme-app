import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Lista from './pages/Lista'
import Formulario from './pages/Formulario'
import Acionamento from './pages/Acionamento'
import Solicitacoes from './pages/Solicitacoes'
import { ThemeProvider } from './contexts/ThemeContext'
import { SidebarProvider } from './contexts/SidebarContext'
import InstallPrompt from './components/ui/InstallPrompt'
import DesktopOnly from './components/routing/DesktopOnly'
import HomeRedirect from './components/routing/HomeRedirect'

export default function App() {
  return (
    <ThemeProvider>
      <SidebarProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />

          {/* Formulários: acessível no celular após Finalizar (editar / link / PDF) */}
          <Route path="/formularios" element={<Lista />} />

          {/* PWA / campo */}
          <Route path="/solicitacoes" element={<Solicitacoes />} />
          <Route path="/formulario/:id" element={<Formulario />} />

          {/* Página geral desktop */}
          <Route path="/acionamento" element={<DesktopOnly><Acionamento /></DesktopOnly>} />
        </Routes>
        <InstallPrompt />
      </BrowserRouter>
      </SidebarProvider>
    </ThemeProvider>
  )
}
