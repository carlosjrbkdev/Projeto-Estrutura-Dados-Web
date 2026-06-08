import { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Stethoscope, User } from 'lucide-react';

export default function Cadastro() {
  const [role, setRole] = useState('paciente');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [crm, setCrm] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [prioridade, setPrioridade] = useState('0');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  const handleCadastro = async (e) => {
    e.preventDefault();
    if (role === 'medico' && !crm) {
      setErro('O campo CRM é obrigatório para médicos.');
      return;
    }
    setLoading(true);
    setErro('');
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, senha);
      const dados = {
        nome,
        email,
        role,
        criadoEm: serverTimestamp(),
      };
      if (role === 'medico') {
        dados.crm = crm.toUpperCase();
        dados.especialidade = especialidade;
        dados.vagasPorDia = 9; // 08:00 às 17:00 = 9 slots
      } else {
        dados.prioridade = parseInt(prioridade);
      }
      await setDoc(doc(db, 'usuarios', cred.user.uid), dados);
      navigate(role === 'medico' ? '/medico' : '/paciente');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setErro('Este e-mail já está cadastrado.');
      } else if (err.code === 'auth/weak-password') {
        setErro('A senha deve ter no mínimo 6 caracteres.');
      } else {
        setErro('Erro ao cadastrar. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 py-10">
      <div className="glass-panel max-w-md w-full p-10 rounded-3xl">
        <h2 className="text-2xl font-extrabold text-center mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Criar Conta
        </h2>

        {/* Toggle Paciente / Médico */}
        <div className="flex bg-slate-800 rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => setRole('paciente')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition ${role === 'paciente' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <User size={16} /> Sou Paciente
          </button>
          <button
            type="button"
            onClick={() => setRole('medico')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition ${role === 'medico' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <Stethoscope size={16} /> Sou Médico
          </button>
        </div>

        <form onSubmit={handleCadastro} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nome Completo</label>
            <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 focus:border-blue-500 outline-none text-white"
              placeholder="Seu nome completo" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">E-mail</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 focus:border-blue-500 outline-none text-white"
              placeholder="seu@email.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Senha</label>
            <input type="password" required value={senha} onChange={(e) => setSenha(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 focus:border-blue-500 outline-none text-white"
              placeholder="Mínimo 6 caracteres" />
          </div>

          {/* Campos do Médico */}
          {role === 'medico' && (
            <>
              <div>
                <label className="block text-sm font-medium text-emerald-400 mb-1">CRM *</label>
                <input type="text" required value={crm} onChange={(e) => setCrm(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-emerald-600 focus:border-emerald-400 outline-none text-white"
                  placeholder="Ex: CRM/SP 123456" />
              </div>
              <div>
                <label className="block text-sm font-medium text-emerald-400 mb-1">Especialidade</label>
                <input type="text" value={especialidade} onChange={(e) => setEspecialidade(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-emerald-600 focus:border-emerald-400 outline-none text-white"
                  placeholder="Ex: Cardiologia, Pediatria..." />
              </div>
            </>
          )}

          {/* Campo do Paciente */}
          {role === 'paciente' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Classificação</label>
              <select value={prioridade} onChange={(e) => setPrioridade(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 focus:border-blue-500 outline-none text-white">
                <option value="0">Atendimento Normal</option>
                <option value="1">Preferencial (Idoso / Gestante)</option>
                <option value="2">Urgência Médica</option>
                <option value="3">Emergência Máxima</option>
              </select>
            </div>
          )}

          {erro && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-400 text-sm px-4 py-2 rounded-lg">
              {erro}
            </div>
          )}

          <button type="submit" disabled={loading}
            className={`w-full mt-2 text-white font-bold py-3 rounded-xl transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${role === 'medico' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
            <UserPlus size={20} />
            {loading ? 'Cadastrando...' : 'Criar Conta'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-6">
          Já tem conta?{' '}
          <Link to="/" className="text-blue-400 hover:underline font-semibold">Fazer login</Link>
        </p>
      </div>
    </div>
  );
}
