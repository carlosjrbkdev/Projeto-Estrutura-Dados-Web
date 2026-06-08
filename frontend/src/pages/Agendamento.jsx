import { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Agendamento() {
  const [nome, setNome] = useState('');
  const [prioridade, setPrioridade] = useState('0');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAgendar = async (e) => {
    e.preventDefault();
    if (!nome) return;
    setLoading(true);
    
    // Gera um código de senha único
    const nivelTexto = prioridade === '0' ? 'NORM' : prioridade === '1' ? 'PREF' : 'URG';
    const numAleatorio = Math.floor(100 + Math.random() * 900);
    const senha = `${nivelTexto}-${numAleatorio}`;

    try {
      await addDoc(collection(db, 'pacientes'), {
        nome,
        prioridade: parseInt(prioridade),
        senha,
        status: 'aguardando', // pode ser: 'aguardando', 'chamado'
        criadoEm: serverTimestamp() // Importante para o Python saber a ordem de chegada
      });
      
      alert(`Consulta marcada! Guarde sua senha: ${senha}`);
      navigate('/acompanhar');
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao marcar consulta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="glass-panel max-w-md w-full p-8 rounded-2xl relative">
        <Link to="/" className="absolute top-4 left-4 text-gray-400 hover:text-white">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="text-3xl font-bold text-center mb-6 text-blue-400">Marcar Consulta</h2>
        
        <form onSubmit={handleAgendar} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nome Completo</label>
            <input 
              type="text" 
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-600 focus:border-blue-500 outline-none transition"
              placeholder="Digite seu nome..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Classificação de Urgência</label>
            <select 
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value)}
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-600 focus:border-blue-500 outline-none transition text-white"
            >
              <option value="0">Atendimento Normal</option>
              <option value="1">Preferencial (Idoso/Gestante)</option>
              <option value="2">Urgência Médica</option>
              <option value="3">Emergência Máxima</option>
            </select>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-transform active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Processando...' : 'Gerar Senha e Entrar na Fila'}
          </button>
        </form>
      </div>
    </div>
  );
}
