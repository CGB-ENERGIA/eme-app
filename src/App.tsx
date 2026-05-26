import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Lista from './pages/Lista'
import Formulario from './pages/Formulario'
import Acionamento from './pages/Acionamento'
import { ThemeProvider } from './contexts/ThemeContext'
import InstallPrompt from './components/ui/InstallPrompt'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Lista />} />
          <Route path="/formulario/:id" element={<Formulario />} />
          <Route path="/acionamento" element={<Acionamento />} />
        </Routes>
        <InstallPrompt />
      </BrowserRouter>
    </ThemeProvider>
  )
}
