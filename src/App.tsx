import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Pacientes from './pages/Pacientes'
import Importar from './pages/Importar'
import Login from './pages/Login'
import Layout from './layouts/Layout'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="pacientes" element={<Pacientes />} />
          <Route path="importar" element={<Importar />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App