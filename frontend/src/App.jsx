import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Agendamento from './pages/Agendamento';
import Acompanhamento from './pages/Acompanhamento';
import Medico from './pages/Medico';

function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-4xl font-extrabold mb-8 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Sistema de Atendimento VIP
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        <Link to="/marcar" className="glass-panel p-8 rounded-2xl hover:scale-105 hover:border-blue-400 flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-2">Sou Paciente</h2>
          <p className="text-gray-400">Marcar uma nova consulta e pegar uma senha.</p>
        </Link>
        <Link to="/acompanhar" className="glass-panel p-8 rounded-2xl hover:scale-105 hover:border-purple-400 flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-2">Acompanhar Fila</h2>
          <p className="text-gray-400">Painel ao vivo para ver a sua posição na fila.</p>
        </Link>
        <Link to="/medico" className="glass-panel p-8 rounded-2xl hover:scale-105 hover:border-emerald-400 flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-2">Área do Médico</h2>
          <p className="text-gray-400">Painel de controle para chamar o próximo paciente.</p>
        </Link>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/marcar" element={<Agendamento />} />
        <Route path="/acompanhar" element={<Acompanhamento />} />
        <Route path="/medico" element={<Medico />} />
      </Routes>
    </Router>
  );
}

export default App;
