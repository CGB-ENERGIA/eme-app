import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Lista from './pages/Lista'
import Formulario from './pages/Formulario'
import Acionamento from './pages/Acionamento'
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
          <Route path="/" element={<Lista />} />
          <Route path="/solicitacoes" element={<Solicitacoes />} />
          <Route path="/formulario/:id" element={<Formulario />} />
          <Route path="/acionamento" element={<Acionamento />} />
        </Routes>
        <InstallPrompt />
      </BrowserRouter>
      </SidebarProvider>
    </ThemeProvider>
  )
}
