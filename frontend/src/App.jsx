import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import PainelPaciente from './pages/PainelPaciente';
import PainelMedico from './pages/PainelMedico';
import Agendamento from './pages/Agendamento';
import Acompanhamento from './pages/Acompanhamento';

function RotaProtegida({ children, role }) {
  const { currentUser, userData } = useAuth();
  if (!currentUser) return <Navigate to="/" replace />;
  if (role && userData?.role !== role) return <Navigate to="/" replace />;
  return children;
}

function App() {
  const { currentUser, userData } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Rota pública: se já logado, redireciona */}
        <Route
          path="/"
          element={
            currentUser
              ? <Navigate to={userData?.role === 'medico' ? '/medico' : '/paciente'} replace />
              : <Login />
          }
        />
        <Route path="/cadastro" element={<Cadastro />} />

        {/* Rotas Protegidas */}
        <Route path="/paciente" element={
          <RotaProtegida role="paciente"><PainelPaciente /></RotaProtegida>
        } />
        <Route path="/agendar/:medicoId" element={
          <RotaProtegida role="paciente"><Agendamento /></RotaProtegida>
        } />
        <Route path="/acompanhar" element={
          <RotaProtegida role="paciente"><Acompanhamento /></RotaProtegida>
        } />
        <Route path="/medico" element={
          <RotaProtegida role="medico"><PainelMedico /></RotaProtegida>
        } />
      </Routes>
    </Router>
  );
}

export default App;
