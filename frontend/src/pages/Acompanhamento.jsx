import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Search, Bell, BellOff, CheckCircle } from 'lucide-react';

export default function Acompanhamento() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const senhaAgendada = location.state?.senha || '';
  const horarioAgendado = location.state?.horario || '';
  const medicoNomeAgendado = location.state?.medicoNome || '';

  const [chamadoAtual, setChamadoAtual] = useState(null);
  const [senhaBusca, setSenhaBusca] = useState(senhaAgendada);
  const [minhaPosicao, setMinhaPosicao] = useState(null);
  const [aguardando, setAguardando] = useState([]);
  const [notificacao, setNotificacao] = useState(null);

  // Paciente atualmente chamado (mais recente)
  useEffect(() => {
    const q = query(
      collection(db, 'consultas'),
      where('status', '==', 'chamado'),
      orderBy('chamadoEm', 'desc'),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) setChamadoAtual(snap.docs[0].data());
      else setChamadoAtual(null);
    });
    return unsub;
  }, []);

  // Fila de espera para calcular posição
  useEffect(() => {
    const q = query(collection(db, 'consultas'), where('status', '==', 'na_fila'));
    const unsub = onSnapshot(q, (snap) => {
      setAguardando(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  // Notificações do paciente logado
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'notificacoes'),
      where('pacienteId', '==', currentUser.uid),
      where('lida', '==', false)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) setNotificacao({ id: snap.docs[0].id, ...snap.docs[0].data() });
      else setNotificacao(null);
    });
    return unsub;
  }, [currentUser]);

  const marcarComoLida = async () => {
    if (!notificacao?.id) return;
    await updateDoc(doc(db, 'notificacoes', notificacao.id), { lida: true });
  };

  const buscarMinhaPosicao = (e) => {
    e.preventDefault();
    if (!senhaBusca) return;
    const eu = aguardando.find(p => p.senha?.toLowerCase() === senhaBusca.toLowerCase());
    if (!eu) {
      alert('Senha não encontrada na fila ativa. Você pode ainda não ter chegado ou já foi chamado.');
      setMinhaPosicao(null);
      return;
    }
    let pessoasNaFrente = 0;
    aguardando.forEach(p => {
      if (p.id === eu.id) return;
      if (p.pacientePrioridade > eu.pacientePrioridade) {
        pessoasNaFrente++;
      } else if (p.pacientePrioridade === eu.pacientePrioridade &&
        (p.chegouEm?.toMillis?.() || 0) < (eu.chegouEm?.toMillis?.() || 0)) {
        pessoasNaFrente++;
      }
    });
    setMinhaPosicao(pessoasNaFrente + 1);
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-4 md:p-8 max-w-2xl mx-auto">
      <div className="w-full flex items-center mb-6">
        <Link to="/paciente" className="text-gray-400 hover:text-white mr-4">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold text-white">Acompanhar Atendimento</h1>
      </div>

      {/* Aviso de consulta agendada */}
      {senhaAgendada && (
        <div className="w-full glass-panel border-blue-500/40 bg-blue-900/10 p-4 rounded-2xl mb-4 flex items-start gap-3">
          <CheckCircle className="text-blue-400 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-blue-300">Consulta agendada com sucesso!</p>
            <p className="text-white text-sm">Sua senha: <strong className="text-blue-200">{senhaAgendada}</strong></p>
            <p className="text-gray-400 text-xs mt-1">
              {medicoNomeAgendado} • {horarioAgendado} • Apresente-se no horário marcado
            </p>
          </div>
        </div>
      )}

      {/* Notificação de remarcação */}
      {notificacao && (
        <div className="w-full glass-panel border-yellow-500/50 bg-yellow-900/20 p-4 rounded-2xl mb-4">
          <div className="flex items-start gap-3">
            <Bell className="text-yellow-400 shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="font-semibold text-yellow-300">Aviso: Consulta Cancelada</p>
              <p className="text-yellow-100 text-sm mt-1">{notificacao.mensagem}</p>
            </div>
          </div>
          <button onClick={marcarComoLida}
            className="mt-3 flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-200 transition">
            <BellOff size={14} /> Marcar como lida
          </button>
        </div>
      )}

      {/* Painel TV: Em atendimento */}
      <div className="w-full glass-panel border-purple-500/30 p-8 rounded-3xl text-center mb-6">
        <p className="text-xs text-purple-400 uppercase tracking-widest font-semibold mb-4">
          🔴 Em Atendimento Agora
        </p>
        {chamadoAtual ? (
          <>
            <div className="text-5xl md:text-7xl font-black text-white mb-3 tracking-tight">
              {chamadoAtual.senha}
            </div>
            <p className="text-xl text-emerald-400 font-semibold">{chamadoAtual.pacienteNome}</p>
            <p className="text-gray-400 text-sm mt-1">
              {chamadoAtual.medicoNome} • Dirija-se ao consultório
            </p>
          </>
        ) : (
          <p className="text-3xl text-gray-600 py-6">Aguardando próximo chamado...</p>
        )}
      </div>

      {/* Minha posição na fila */}
      <div className="w-full glass-panel p-5 rounded-2xl">
        <h3 className="font-bold text-white mb-1">Qual é minha posição?</h3>
        <p className="text-gray-400 text-sm mb-4">
          Digite sua senha para ver quantas pessoas estão na sua frente.
        </p>
        <form onSubmit={buscarMinhaPosicao} className="flex gap-2">
          <input
            type="text"
            placeholder="Ex: NORM-123"
            value={senhaBusca}
            onChange={(e) => setSenhaBusca(e.target.value)}
            className="flex-1 p-3 rounded-lg bg-slate-800 border border-slate-600 focus:border-purple-500 outline-none text-white uppercase text-sm"
          />
          <button type="submit"
            className="bg-purple-600 hover:bg-purple-500 px-4 rounded-lg flex items-center justify-center transition">
            <Search size={20} />
          </button>
        </form>

        {minhaPosicao !== null && (
          <div className="mt-4 p-4 bg-purple-900/20 rounded-xl border border-purple-500/40 text-center">
            <p className="text-gray-300 text-sm mb-1">Você está em</p>
            <p className="text-5xl font-black text-purple-400">{minhaPosicao}º</p>
            <p className="text-gray-400 text-xs mt-1">na fila • posição calculada pelo sistema Heap/Fila</p>
          </div>
        )}
      </div>
    </div>
  );
}
