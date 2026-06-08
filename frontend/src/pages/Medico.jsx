import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, Users } from 'lucide-react';

export default function Medico() {
  const [qtdAguardando, setQtdAguardando] = useState(0);
  const [aguardandoPriority, setAguardandoPriority] = useState(0);
  const [pacientesNaEspera, setPacientesNaEspera] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const qAguardando = query(collection(db, 'pacientes'), where('status', '==', 'aguardando'));
    const unsubs = onSnapshot(qAguardando, (snapshot) => {
      setQtdAguardando(snapshot.size);
      
      const lista = [];
      let countPriority = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.prioridade > 0) countPriority++;
        
        lista.push({
          id: doc.id,
          ...data,
          // Transforma o timestamp do Firebase em milissegundos para o Python processar
          criadoEm: data.criadoEm ? data.criadoEm.toMillis() : 0 
        });
      });
      
      setAguardandoPriority(countPriority);
      setPacientesNaEspera(lista);
    });
    return () => unsubs();
  }, []);

  const handleChamarProximo = async () => {
    if (pacientesNaEspera.length === 0) return;
    setLoading(true);

    try {
      // 1. Envia a lista desordenada para o motor em Python
      const response = await fetch('http://localhost:5000/calcular_proximo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pacientes: pacientesNaEspera })
      });

      if (!response.ok) throw new Error("Erro no servidor Python");
      
      const data = await response.json();
      const pacienteEscolhido = data.proximo;

      if (pacienteEscolhido) {
        // 2. O Python usou o Heap/Fila e retornou quem é o próximo! Atualiza no Firebase.
        const pacienteRef = doc(db, 'pacientes', pacienteEscolhido.id);
        await updateDoc(pacienteRef, {
          status: 'chamado',
          chamadoEm: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Erro ao chamar:', error);
      alert('Certifique-se de que o servidor Python (app.py) está rodando localmente na porta 5000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="glass-panel max-w-lg w-full p-8 rounded-2xl relative">
        <Link to="/" className="absolute top-4 left-4 text-gray-400 hover:text-white">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="text-3xl font-bold text-center mb-2 text-emerald-400">Painel do Médico</h2>
        <p className="text-center text-gray-400 mb-8">Controle de Fluxo</p>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-800 p-4 rounded-xl text-center border border-slate-600">
            <Users className="mx-auto mb-2 text-blue-400" size={32} />
            <div className="text-3xl font-bold">{qtdAguardando}</div>
            <div className="text-sm text-gray-400">Total Aguardando</div>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl text-center border border-red-500/30">
            <UserPlus className="mx-auto mb-2 text-red-400" size={32} />
            <div className="text-3xl font-bold">{aguardandoPriority}</div>
            <div className="text-sm text-gray-400">Prioridades (Heap)</div>
          </div>
        </div>

        <button 
          onClick={handleChamarProximo}
          disabled={qtdAguardando === 0 || loading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xl font-bold py-6 rounded-xl transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
        >
          <UserPlus size={28} />
          {loading ? 'Calculando no Heap...' : 'Chamar Próximo'}
        </button>
        <p className="text-xs text-gray-500 text-center mt-4">
          O cálculo do próximo paciente é processado pelo Backend em Python usando as estruturas Fila e Heap.
        </p>
      </div>
    </div>
  );
}
