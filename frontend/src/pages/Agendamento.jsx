import { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, CalendarCheck } from 'lucide-react';

export default function Agendamento() {
  const { medicoId } = useParams();
  const { state } = useLocation();
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();

  const vagasLivres = state?.vagasLivres || [];
  const medicoNome = state?.medicoNome || 'Médico';
  const especialidade = state?.especialidade || '';

  const [horario, setHorario] = useState(vagasLivres[0] || '');
  const [loading, setLoading] = useState(false);

  const hoje = new Date().toISOString().split('T')[0];
  const hojeFormatado = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });

  const handleAgendar = async (e) => {
    e.preventDefault();
    if (!horario) return;
    setLoading(true);

    const nivelTexto = ['NORM', 'PREF', 'URG', 'EMER'][userData?.prioridade ?? 0];
    const senha = `${nivelTexto}-${Math.floor(100 + Math.random() * 900)}`;

    try {
      await addDoc(collection(db, 'consultas'), {
        pacienteId: currentUser.uid,
        pacienteNome: userData?.nome || 'Paciente',
        pacientePrioridade: userData?.prioridade ?? 0,
        medicoId,
        medicoNome,
        data: hoje,
        horario,
        status: 'agendado',
        senha,
        criadoEm: serverTimestamp(),
      });
      navigate('/acompanhar', { state: { senha, horario, medicoNome } });
    } catch (err) {
      console.error(err);
      alert('Erro ao agendar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="glass-panel max-w-md w-full p-8 rounded-2xl relative">
        <Link to="/paciente" className="absolute top-4 left-4 text-gray-400 hover:text-white">
          <ArrowLeft size={24} />
        </Link>

        <div className="text-center mb-6">
          <CalendarCheck className="mx-auto text-blue-400 mb-3" size={40} />
          <h2 className="text-2xl font-bold text-white">Confirmar Agendamento</h2>
          <p className="text-blue-300 font-semibold mt-1">{medicoNome}</p>
          {especialidade && <p className="text-gray-400 text-sm">{especialidade}</p>}
        </div>

        <div className="bg-slate-800/60 rounded-xl p-4 mb-6 text-sm text-gray-300">
          <p>📅 <span className="font-semibold text-white capitalize">{hojeFormatado}</span></p>
          <p className="mt-1">👤 Paciente: <span className="text-white font-semibold">{userData?.nome}</span></p>
        </div>

        <form onSubmit={handleAgendar} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Horário Disponível
            </label>
            <div className="grid grid-cols-3 gap-2">
              {vagasLivres.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setHorario(slot)}
                  className={`py-2 rounded-lg text-sm font-bold transition border ${
                    horario === slot
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : 'bg-slate-800 border-slate-600 text-gray-300 hover:border-blue-500'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !horario}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CalendarCheck size={20} />
            {loading ? 'Agendando...' : 'Confirmar Consulta'}
          </button>
        </form>
      </div>
    </div>
  );
}
