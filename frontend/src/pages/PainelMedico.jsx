import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, addDoc, serverTimestamp
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, UserCheck, UserX, Users, ChevronRight, Clock } from 'lucide-react';

function getHoje() {
  return new Date().toISOString().split('T')[0];
}

const labelPrioridade = ['Normal', 'Preferencial', 'Urgência', 'Emergência'];
const corPrioridade = [
  'border-slate-600 bg-slate-800/40',
  'border-yellow-600/50 bg-yellow-900/20',
  'border-orange-600/50 bg-orange-900/20',
  'border-red-600/50 bg-red-900/20',
];
const badgePrioridade = [
  'bg-gray-700 text-gray-300',
  'bg-yellow-900/60 text-yellow-300',
  'bg-orange-900/60 text-orange-300',
  'bg-red-900/60 text-red-300',
];

export default function PainelMedico() {
  const { currentUser, userData, logout } = useAuth();
  const navigate = useNavigate();
  const hoje = getHoje();

  const [agendados, setAgendados] = useState([]);      // status: agendado
  const [naFila, setNaFila] = useState([]);             // status: na_fila
  const [chamadoAtual, setChamadoAtual] = useState(null);
  const [loading, setLoading] = useState('');

  // Consultas agendadas para hoje (aguardando chegada)
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'consultas'),
      where('medicoId', '==', currentUser.uid),
      where('data', '==', hoje),
      where('status', '==', 'agendado')
    );
    const unsub = onSnapshot(q, (snap) => {
      setAgendados(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.horario.localeCompare(b.horario)));
    });
    return unsub;
  }, [currentUser, hoje]);

  // Pacientes na fila (já chegaram)
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'consultas'),
      where('medicoId', '==', currentUser.uid),
      where('data', '==', hoje),
      where('status', '==', 'na_fila')
    );
    const unsub = onSnapshot(q, (snap) => {
      setNaFila(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [currentUser, hoje]);

  // Último chamado
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'consultas'),
      where('medicoId', '==', currentUser.uid),
      where('data', '==', hoje),
      where('status', '==', 'chamado')
    );
    const unsub = onSnapshot(q, (snap) => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (lista.length > 0) {
        lista.sort((a, b) => (b.chamadoEm?.toMillis?.() || 0) - (a.chamadoEm?.toMillis?.() || 0));
        setChamadoAtual(lista[0]);
      }
    });
    return unsub;
  }, [currentUser, hoje]);

  // Marcar que o paciente chegou → entra na fila
  const handleChegou = async (consulta) => {
    setLoading(`chegou-${consulta.id}`);
    try {
      // Validação de dados antes de enviar
      if (!consulta.pacienteNome || consulta.pacienteNome.trim() === '') {
        alert('Erro: Nome do paciente não está preenchido. Verifique os dados da consulta.');
        setLoading('');
        return;
      }

      const payload = {
        id: consulta.id,
        nome: consulta.pacienteNome.trim(),
        prioridade: typeof consulta.pacientePrioridade === 'number' ? consulta.pacientePrioridade : 0,
        criadoEm: consulta.criadoEm?.toMillis?.() || Date.now()
      };

      const response = await fetch('https://lavish-blessing-production-b5ca.up.railway.app/adicionar_na_fila', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.erro || 'Erro desconhecido no servidor');
      }

      await updateDoc(doc(db, 'consultas', consulta.id), {
        status: 'na_fila',
        chegouEm: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
      alert(`Erro ao adicionar na fila: ${err.message}\n\nVerifique se o servidor Python está rodando em https://lavish-blessing-production-b5ca.up.railway.app`);
    } finally {
      setLoading('');
    }
  };

  // Não compareceu → cancela e notifica paciente
  const handleNaoCompareceu = async (consulta) => {
    if (!confirm(`Confirmar cancelamento de ${consulta.pacienteNome}? O paciente será notificado para remarcar.`)) return;
    setLoading(`cancel-${consulta.id}`);
    try {
      await updateDoc(doc(db, 'consultas', consulta.id), { status: 'cancelado' });
      await addDoc(collection(db, 'notificacoes'), {
        pacienteId: consulta.pacienteId,
        medicoNome: userData?.nome || 'Médico',
        mensagem: `Sua consulta das ${consulta.horario} com ${userData?.nome || 'o médico'} foi cancelada por não comparecimento. Por favor, remarque.`,
        data: hoje,
        lida: false,
        criadoEm: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
      alert('Erro ao cancelar.');
    } finally {
      setLoading('');
    }
  };

  // Chamar próximo da fila (usa Python para calcular quem é)
  const handleChamarProximo = async () => {
    if (naFila.length === 0) return;
    setLoading('chamar');
    try {
      const pacientesFormatados = naFila.map(p => ({
        id: p.id,
        nome: p.pacienteNome || 'Paciente Desconhecido',
        prioridade: typeof p.pacientePrioridade === 'number' ? p.pacientePrioridade : 0,
        criadoEm: p.chegouEm?.toMillis?.() || p.criadoEm?.toMillis?.() || Date.now()
      }));

      const response = await fetch('https://lavish-blessing-production-b5ca.up.railway.app/calcular_proximo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pacientes: pacientesFormatados })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.erro || 'Erro desconhecido');
      }

      const data = await response.json();
      if (data.proximo) {
        await updateDoc(doc(db, 'consultas', data.proximo.id), {
          status: 'chamado',
          chamadoEm: serverTimestamp()
        });
      }
    } catch (err) {
      console.error(err);
      alert(`Erro ao chamar próximo: ${err.message}\n\nVerifique se o servidor Python está rodando na porta 5000.`);
    } finally {
      setLoading('');
    }
  };

  const handleLogout = async () => { await logout(); navigate('/'); };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dr(a). {userData?.nome?.split(' ')[0]}</h1>
          <p className="text-emerald-400 text-sm">{userData?.especialidade || 'Médico'} • {userData?.crm}</p>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition text-sm">
          <LogOut size={18} /> Sair
        </button>
      </div>

      {/* Em Atendimento */}
      {chamadoAtual && (
        <div className="glass-panel border-emerald-500/40 bg-emerald-900/10 p-5 rounded-2xl mb-6 flex items-center gap-4">
          <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-full p-3">
            <UserCheck className="text-emerald-400" size={28} />
          </div>
          <div>
            <p className="text-xs text-emerald-400 uppercase tracking-wider font-semibold">Em Atendimento Agora</p>
            <p className="text-xl font-bold text-white">{chamadoAtual.pacienteNome}</p>
            <p className="text-emerald-300 text-sm">Senha: {chamadoAtual.senha} • {chamadoAtual.horario}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Coluna 1: Agendados (aguardando chegada) */}
        <div>
          <h2 className="text-base font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Clock size={18} className="text-blue-400" />
            Agendados para Hoje ({agendados.length})
          </h2>
          <div className="flex flex-col gap-3">
            {agendados.length === 0 && (
              <div className="glass-panel p-6 rounded-xl text-center text-gray-500 text-sm">
                Nenhum paciente agendado pendente.
              </div>
            )}
            {agendados.map((c) => (
              <div key={c.id}
                className={`glass-panel p-4 rounded-xl border ${corPrioridade[c.pacientePrioridade ?? 0]}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-white">{c.pacienteNome}</p>
                    <p className="text-gray-400 text-xs">🕐 {c.horario} • Senha: {c.senha}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badgePrioridade[c.pacientePrioridade ?? 0]}`}>
                    {labelPrioridade[c.pacientePrioridade ?? 0]}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleChegou(c)}
                    disabled={!!loading}
                    className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-lg transition active:scale-95 disabled:opacity-50"
                  >
                    <UserCheck size={14} />
                    {loading === `chegou-${c.id}` ? 'Adicionando...' : 'Chegou'}
                  </button>
                  <button
                    onClick={() => handleNaoCompareceu(c)}
                    disabled={!!loading}
                    className="flex-1 flex items-center justify-center gap-1 bg-red-700 hover:bg-red-600 text-white text-xs font-bold py-2 rounded-lg transition active:scale-95 disabled:opacity-50"
                  >
                    <UserX size={14} />
                    {loading === `cancel-${c.id}` ? 'Cancelando...' : 'Não Compareceu'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coluna 2: Fila Ativa */}
        <div>
          <h2 className="text-base font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Users size={18} className="text-purple-400" />
            Fila de Espera ({naFila.length})
          </h2>
          <button
            onClick={handleChamarProximo}
            disabled={naFila.length === 0 || loading === 'chamar'}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl mb-4 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-40"
          >
            <ChevronRight size={20} />
            {loading === 'chamar' ? 'Calculando no Heap...' : 'Chamar Próximo (Heap/Fila)'}
          </button>
          <div className="flex flex-col gap-3">
            {naFila.length === 0 && (
              <div className="glass-panel p-6 rounded-xl text-center text-gray-500 text-sm">
                Fila vazia. Confirme a chegada dos pacientes.
              </div>
            )}
            {naFila.map((c, i) => (
              <div key={c.id}
                className={`glass-panel p-4 rounded-xl border ${corPrioridade[c.pacientePrioridade ?? 0]} flex items-center gap-3`}>
                <span className="text-2xl font-black text-gray-600">#{i + 1}</span>
                <div className="flex-1">
                  <p className="font-bold text-white text-sm">{c.pacienteNome}</p>
                  <p className="text-gray-400 text-xs">Senha: {c.senha}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badgePrioridade[c.pacientePrioridade ?? 0]}`}>
                  {labelPrioridade[c.pacientePrioridade ?? 0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
