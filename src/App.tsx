import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Lista from './pages/Lista'
import Formulario from './pages/Formulario'
import Acionamento from './pages/Acionamento'
import Solicitacoes from './pages/Solicitacoes'
import { ThemeProvider } from './contexts/ThemeContext'
import { SidebarProvider } from './contexts/SidebarContext'
import { RoleProvider } from './contexts/RoleContext'
import InstallPrompt from './components/ui/InstallPrompt'
import DesktopOnly from './components/routing/DesktopOnly'
import HomeRedirect from './components/routing/HomeRedirect'
import SolicitanteOnly from './components/routing/SolicitanteOnly'

export default function App() {
  return (
    <ThemeProvider>
      <SidebarProvider>
      <RoleProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />

          {/* Formulários: solicitante e equipe de campo */}
          <Route path="/formularios" element={<Lista />} />

          {/* Só quem solicita — equipe de campo (link) não acessa */}
          <Route path="/solicitacoes" element={<SolicitanteOnly><Solicitacoes /></SolicitanteOnly>} />
          <Route path="/formulario/:id" element={<Formulario />} />

          <Route path="/acionamento" element={<DesktopOnly><Acionamento /></DesktopOnly>} />
        </Routes>
        <InstallPrompt />
      </BrowserRouter>
      </RoleProvider>
      </SidebarProvider>
    </ThemeProvider>
  )
}
