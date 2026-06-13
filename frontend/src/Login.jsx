import { useState, useEffect } from 'react';
import { auth } from './api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hayUsuarios, setHayUsuarios] = useState(true);
  const [modoRegistro, setModoRegistro] = useState(false);
  const [regNombre, setRegNombre] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  useEffect(() => {
    auth.checkUsuarios().then(r => {
      if (!r.hay_usuarios) setModoRegistro(true);
      setHayUsuarios(r.hay_usuarios);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await auth.login(email, password);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      onLogin(data.usuario);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistro = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await auth.registro({
        nombre: regNombre,
        email: regEmail,
        password: regPassword,
        rol: 'admin',
      });
      // Auto-login after registration
      const data = await auth.login(regEmail, regPassword);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      onLogin(data.usuario);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-slate-900">
              <path d="M4 9L8 5V15L4 19V9Z" fill="currentColor" opacity="0.85"/>
              <path d="M10 7L14 3V13L10 17V7Z" fill="currentColor"/>
              <path d="M16 11L20 7V17L16 21V11Z" fill="currentColor" opacity="0.85"/>
            </svg>
            <span className="text-xl font-bold tracking-tighter text-slate-900">Balance OS</span>
          </div>
          <p className="text-sm text-slate-500">CRM interno — Balance Consultores</p>
          {modoRegistro && (
            <p className="text-xs text-amber-600 mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
              No hay usuarios registrados. Crea el primer usuario (admin).
            </p>
          )}
        </div>

        <form onSubmit={modoRegistro ? handleRegistro : handleSubmit} className="bg-white rounded-2xl p-6 shadow-[0_12px_32px_rgba(0,0,0,0.04)] border border-slate-900/5">
          <h2 className="text-lg font-semibold text-slate-900 mb-5">
            {modoRegistro ? 'Crear primer usuario' : 'Iniciar sesión'}
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>
          )}

          <div className="space-y-4">
            {modoRegistro && (
              <input
                type="text" placeholder="Nombre completo" value={regNombre}
                onChange={(e) => setRegNombre(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15 focus:bg-white placeholder:text-slate-400"
              />
            )}
            <input
              type="email" placeholder="Correo electrónico" value={modoRegistro ? regEmail : email}
              onChange={(e) => modoRegistro ? setRegEmail(e.target.value) : setEmail(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15 focus:bg-white placeholder:text-slate-400"
            />
            <input
              type="password" placeholder="Contraseña" value={modoRegistro ? regPassword : password}
              onChange={(e) => modoRegistro ? setRegPassword(e.target.value) : setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-[#2E8B57] focus:ring-2 focus:ring-[#2E8B57]/15 focus:bg-white placeholder:text-slate-400"
            />
            <button
              type="submit" disabled={loading}
              className="w-full bg-slate-900 text-white text-sm font-semibold rounded-xl py-3.5 transition-all duration-200 hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? 'Procesando...' : modoRegistro ? 'Crear y entrar' : 'Entrar'}
            </button>
          </div>

          {hayUsuarios && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => { setModoRegistro(!modoRegistro); setError(''); }}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                {modoRegistro ? '← Volver al inicio de sesión' : 'Registrar nuevo usuario'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
