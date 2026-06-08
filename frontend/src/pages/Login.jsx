import { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Stethoscope } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro('');
    try {
      const cred = await signInWithEmailAndPassword(auth, email, senha);
      const snap = await getDoc(doc(db, 'usuarios', cred.user.uid));
      if (snap.exists() && snap.data().role === 'medico') {
        navigate('/medico');
      } else {
        navigate('/paciente');
      }
    } catch {
      setErro('E-mail ou senha incorretos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="glass-panel max-w-md w-full p-10 rounded-3xl">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600/20 border border-blue-500/40 rounded-full p-4 mb-4">
            <Stethoscope className="text-blue-400" size={40} />
          </div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            ClinicaWeb
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Sistema de Atendimento Inteligente</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 focus:border-blue-500 outline-none text-white"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Senha</label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-600 focus:border-blue-500 outline-none text-white"
              placeholder="••••••••"
            />
          </div>

          {erro && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-400 text-sm px-4 py-2 rounded-lg">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <LogIn size={20} />
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-6">
          Não tem conta?{' '}
          <Link to="/cadastro" className="text-blue-400 hover:underline font-semibold">
            Cadastre-se aqui
          </Link>
        </p>
      </div>
    </div>
  );
}
