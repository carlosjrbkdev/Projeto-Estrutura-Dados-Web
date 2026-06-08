import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Bell } from 'lucide-react';

export default function Acompanhamento() {
  const [pacienteAtual, setPacienteAtual] = useState(null);
  const [senhaBusca, setSenhaBusca] = useState('');
  const [minhaPosicao, setMinhaPosicao] = useState(null);
  const [aguardando, setAguardando] = useState([]);

  useEffect(() => {
    // Escuta pacientes que já foram chamados (para o painel de TV da clínica)
    const qChamados = query(
      collection(db, 'pacientes'), 
      where('status', '==', 'chamado'), 
      orderBy('chamadoEm', 'desc'),
      limit(1)
    );
    const unsubsChamados = onSnapshot(qChamados, (snapshot) => {
      if (!snapshot.empty) {
        setPacienteAtual(snapshot.docs[0].data());
      }
    });

    // Escuta todos aguardando para calcular a posição aproximada (enquanto o Python cuida do servidor)
    const qAguardando = query(collection(db, 'pacientes'), where('status', '==', 'aguardando'));
    const unsubsAguardando = onSnapshot(qAguardando, (snapshot) => {
      const lista = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAguardando(lista);
    });

    return () => {
      unsubsChamados();
      unsubsAguardando();
    };
  }, []);

  const buscarMinhaPosicao = (e) => {
    e.preventDefault();
    if (!senhaBusca) return;
    
    const eu = aguardando.find(p => p.senha.toLowerCase() === senhaBusca.toLowerCase());
    if (!eu) {
      alert("Senha não encontrada na fila de espera. Verifique se digitou correto ou se já foi chamado.");
      setMinhaPosicao(null);
      return;
    }

    // Simulando a lógica matemática do Heap/Fila no frontend para a tela do paciente:
    // Conta quantos pacientes tem prioridade maior, ou igual mas que chegaram antes.
    let pessoasNaFrente = 0;
    aguardando.forEach(p => {
      if (p.id === eu.id) return;
      if (p.prioridade > eu.prioridade) {
        pessoasNaFrente++;
      } else if (p.prioridade === eu.prioridade && p.criadoEm?.toMillis() < eu.criadoEm?.toMillis()) {
        pessoasNaFrente++;
      }
    });
    
    setMinhaPosicao(pessoasNaFrente + 1);
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-4 md:p-8">
      <Link to="/" className="absolute top-4 left-4 text-gray-400 hover:text-white">
        <ArrowLeft size={24} />
      </Link>
      
      {/* PAINEL DA CLÍNICA (Status Global) */}
      <div className="w-full max-w-4xl glass-panel p-8 rounded-3xl text-center mb-8 border-purple-500/30">
        <h2 className="text-xl font-semibold text-purple-300 uppercase tracking-widest mb-4 flex justify-center items-center gap-2">
          <Bell size={20} /> Em Atendimento
        </h2>
        {pacienteAtual ? (
          <div className="animate-pulse">
            <div className="text-6xl md:text-8xl font-black text-white mb-4 tracking-tighter">
              {pacienteAtual.senha}
            </div>
            <div className="text-2xl text-emerald-400">
              Paciente: {pacienteAtual.nome}
            </div>
            <div className="text-gray-400 mt-2">Dirija-se ao consultório</div>
          </div>
        ) : (
          <div className="text-3xl text-gray-500 py-8">Nenhum paciente chamado ainda</div>
        )}
      </div>

      {/* ÁREA DO PACIENTE (Minha Posição) */}
      <div className="w-full max-w-xl glass-panel p-6 rounded-2xl">
        <h3 className="text-xl font-bold mb-4">Acompanhe sua vez pelo celular</h3>
        <p className="text-gray-400 mb-6 text-sm">Digite a senha que você recebeu no agendamento para calcular quantas pessoas estão na sua frente.</p>
        
        <form onSubmit={buscarMinhaPosicao} className="flex gap-2">
          <input 
            type="text" 
            placeholder="Ex: NORM-123" 
            value={senhaBusca}
            onChange={(e) => setSenhaBusca(e.target.value)}
            className="flex-1 p-3 rounded-lg bg-slate-800 border border-slate-600 focus:border-purple-500 outline-none text-white uppercase"
          />
          <button type="submit" className="bg-purple-600 hover:bg-purple-500 p-3 rounded-lg flex items-center justify-center transition">
            <Search size={20} />
          </button>
        </form>

        {minhaPosicao !== null && (
          <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-purple-500/50 text-center">
            <div className="text-sm text-gray-300 mb-1">Sua posição aproximada na fila é:</div>
            <div className="text-4xl font-bold text-purple-400">{minhaPosicao}º lugar</div>
            <div className="text-xs text-gray-500 mt-2">Esta posição é calculada em tempo real com base no grau de urgência.</div>
          </div>
        )}
      </div>
    </div>
  );
}
