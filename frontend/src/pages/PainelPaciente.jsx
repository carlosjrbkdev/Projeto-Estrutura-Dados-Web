import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Stethoscope, Clock, CheckCircle, XCircle, Bell } from 'lucide-react';

const SLOTS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00'];

function getHoje() {
  return new Date().toISOString().split('T')[0];
}

export default function PainelPaciente() {
  const { userData, logout } = useAuth();
  const navigate = useNavigate();
  const [medicos, setMedicos] = useState([]);
  const [checkingId, setCheckingId] = useState(null);
  const [notificacao, setNotificacao] = useState(null);
  const { currentUser } = useAuth();

  // Carrega médicos dinamicamente do Firestore
  useEffect(() => {
    const q = query(collection(db, 'usuarios'), where('role', '==', 'medico'));
    const unsub = onSnapshot(q, (snap) => {
      setMedicos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  // Escuta notificações de remarcação
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'notificacoes'),
      where('pacienteId', '==', currentUser.uid),
      where('lida', '==', false)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setNotificacao(snap.docs[0].data());
      } else {
        setNotificacao(null);
      }
    });
    return unsub;
  }, [currentUser]);

  const handleSelecionarMedico = async (medico) => {
    setCheckingId(medico.id);
    const hoje = getHoje();
    // Busca quantas consultas já foram agendadas para este médico hoje
    const q = query(
      collection(db, 'consultas'),
      where('medicoId', '==', medico.id),
      where('data', '==', hoje),
      where('status', 'in', ['agendado', 'na_fila', 'chamado'])
    );
    const snap = await getDocs(q);
    const horariosOcupados = snap.docs.map(d => d.data().horario);
    const vagasLivres = SLOTS.filter(s => !horariosOcupados.includes(s));

    if (vagasLivres.length === 0) {
      alert(`Não há vagas disponíveis hoje para Dr(a). ${medico.nome}.\nPor favor, tente outro médico ou retorne amanhã.`);
      setCheckingId(null);
      return;
    }
    // Há vaga: navega para agendamento passando os dados via state
    navigate(`/agendar/${medico.id}`, {
      state: { medicoNome: medico.nome, especialidade: medico.especialidade, vagasLivres }
    });
    setCheckingId(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const labelPrioridade = {
    0: { label: 'Normal', color: 'text-gray-400', bg: 'bg-gray-700' },
    1: { label: 'Preferencial', color: 'text-yellow-400', bg: 'bg-yellow-900/40' },
    2: { label: 'Urgência', color: 'text-orange-400', bg: 'bg-orange-900/40' },
    3: { label: 'Emergência', color: 'text-red-400', bg: 'bg-red-900/40' },
  };
  const prio = labelPrioridade[userData?.prioridade ?? 0];

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Olá, {userData?.nome?.split(' ')[0]}! 👋</h1>
          <span className={`inline-block mt-1 text-xs font-semibold px-3 py-1 rounded-full ${prio.bg} ${prio.color}`}>
            {prio.label}
          </span>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition text-sm">
          <LogOut size={18} /> Sair
        </button>
      </div>

      {/* Notificação de Remarcação */}
      {notificacao && (
        <div className="glass-panel border-yellow-500/50 p-4 rounded-2xl mb-6 flex items-start gap-3 bg-yellow-900/20">
          <Bell className="text-yellow-400 mt-0.5 shrink-0" size={20} />
          <div>
            <p className="font-semibold text-yellow-300">Aviso do Médico</p>
            <p className="text-yellow-100 text-sm mt-1">{notificacao.mensagem}</p>
            <p className="text-yellow-400 text-xs mt-1">Por favor, remarque sua consulta abaixo.</p>
          </div>
        </div>
      )}

      {/* Lista de Médicos */}
      <h2 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
        <Stethoscope size={20} className="text-blue-400" />
        Médicos Disponíveis
      </h2>

      {medicos.length === 0 ? (
        <div className="glass-panel p-10 rounded-2xl text-center text-gray-500">
          <Stethoscope size={40} className="mx-auto mb-3 opacity-30" />
          <p>Nenhum médico cadastrado no sistema ainda.</p>
          <p className="text-sm mt-1">Aguarde o cadastro dos profissionais.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {medicos.map((med) => (
            <button
              key={med.id}
              onClick={() => handleSelecionarMedico(med)}
              disabled={checkingId === med.id}
              className="glass-panel p-5 rounded-2xl text-left hover:border-blue-400/60 hover:scale-[1.02] active:scale-95 disabled:opacity-60 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="bg-blue-600/20 border border-blue-500/30 rounded-full p-3">
                  <Stethoscope className="text-blue-400" size={24} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white text-lg">{med.nome}</p>
                  <p className="text-blue-300 text-sm">{med.especialidade || 'Clínica Geral'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock size={14} className="text-gray-400" />
                    <span className="text-gray-400 text-xs">08:00 – 17:00 | {med.vagasPorDia ?? 9} vagas/dia</span>
                  </div>
                  {med.crm && <p className="text-gray-500 text-xs mt-1">{med.crm}</p>}
                </div>
                {checkingId === med.id ? (
                  <span className="text-blue-400 text-xs animate-pulse">Verificando...</span>
                ) : (
                  <CheckCircle size={20} className="text-emerald-400 opacity-60 mt-1" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Rodapé info */}
      <div className="mt-8 text-center text-gray-600 text-xs">
        <p>Desenvolvido por Carlos & Graziela • Estruturas de Dados 2026</p>
      </div>
    </div>
  );
}
