import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Lista from './pages/Lista'
import Formulario from './pages/Formulario'
import Acionamento from './pages/Acionamento'
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
          <Route path="/formulario/:id" element={<Formulario />} />
          <Route path="/acionamento" element={<Acionamento />} />
        </Routes>
        <InstallPrompt />
      </BrowserRouter>
      </SidebarProvider>
    </ThemeProvider>
  )
}
