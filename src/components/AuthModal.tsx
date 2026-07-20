import { useState, FormEvent } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signOut
} from 'firebase/auth';
import { auth, isFirebaseAvailable } from '../firebase';
import { Lock, Mail, User, ShieldAlert, Sparkles } from 'lucide-react';

interface AuthModalProps {
  onAuthSuccess: (user: { uid: string; email: string | null; displayName: string | null } | null) => void;
  currentUser: { uid: string; email: string | null; displayName: string | null } | null;
  onClose?: () => void;
}

export default function AuthModal({ onAuthSuccess, currentUser, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!isFirebaseAvailable) {
      // Offline/Demo Mode Auth Simulation
      setTimeout(() => {
        const mockUser = {
          uid: 'mock_user_123',
          email: email || 'enfermeiro.demo@shiftpass.com',
          displayName: isSignUp ? name : (name || email.split('@')[0] || 'Enf. Convidado')
        };
        onAuthSuccess(mockUser);
        setLoading(false);
        if (onClose) onClose();
      }, 600);
      return;
    }

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: name
        });
        onAuthSuccess({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: name
        });
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        onAuthSuccess({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'Enfermeiro(a)'
        });
      }
      if (onClose) onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve conter pelo menos 6 caracteres.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('O método de login por E-mail/Senha está desativado no Console do Firebase. Para resolver isso: 1. Acesse o Console do Firebase; 2. Vá em "Authentication" > "Sign-in method"; 3. Clique em "Adicionar novo provedor" e ative "E-mail/senha".');
      } else {
        setError(err.message || 'Erro ao realizar autenticação.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAccess = () => {
    onAuthSuccess({
      uid: 'sandbox_guest',
      email: 'convidado.sandbox@shiftpass.com',
      displayName: 'Enf. Convidado (Sandbox)'
    });
    if (onClose) onClose();
  };

  const handleLogout = async () => {
    if (isFirebaseAvailable) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Error logging out from Firebase:', err);
      }
    }
    onAuthSuccess(null);
  };

  if (currentUser) {
    return (
      <div id="auth-panel" className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-xl max-w-md mx-auto">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
          Sessão Profissional Ativa
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Você está conectado como <span className="font-medium text-slate-700 dark:text-slate-300">{currentUser.displayName || currentUser.email}</span>.
        </p>
        <div className="flex gap-3">
          <button
            id="btn-logout"
            onClick={handleLogout}
            className="flex-1 py-2 px-4 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors duration-200"
          >
            Encerrar Plantão (Sair)
          </button>
          {onClose && (
            <button
              id="btn-close-auth"
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 transition-colors duration-200"
            >
              Voltar
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div id="auth-form-card" className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl max-w-md w-full mx-auto relative overflow-hidden">
      {/* Decorative gradient blur */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mb-3">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          Acesso ShiftPass
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
          Identifique-se para registrar e auditar as passagens de plantão.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900/50 text-sm">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleAuth} className="space-y-4">
        {isSignUp && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Nome do Enfermeiro(a)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                placeholder="Ex: Enfª. Carla Souza"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
              />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">E-mail Profissional</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Mail className="w-4 h-4" />
            </span>
            <input
              type="email"
              required
              placeholder="seu.nome@hospital.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Senha</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Lock className="w-4 h-4" />
            </span>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
            />
          </div>
        </div>

        <button
          id="btn-submit-auth"
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-2xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 shadow-lg shadow-indigo-600/10 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none mt-2"
        >
          {loading ? 'Processando...' : isSignUp ? 'Criar Cadastro' : 'Entrar no Sistema'}
        </button>
      </form>

      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-150 dark:border-slate-800"></div>
        </div>
        <span className="relative px-3 text-xs text-slate-400 bg-white dark:bg-slate-900">
          ou experimente agora
        </span>
      </div>

      <button
        id="btn-guest-sandbox"
        onClick={handleGuestAccess}
        className="w-full py-3 px-4 rounded-2xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 active:scale-[0.98] transition-all duration-150 mb-4"
      >
        Entrar como Plantonista Convidado (Modo Local)
      </button>

      <div className="text-center">
        <button
          id="btn-toggle-signup"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError(null);
          }}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
        >
          {isSignUp ? 'Já possui conta? Faça Login' : 'Não tem login? Cadastre-se em segundos'}
        </button>
      </div>
    </div>
  );
}
