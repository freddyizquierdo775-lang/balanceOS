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
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

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
      await auth.registro({ nombre: regNombre, email: regEmail, password: regPassword, rol: 'admin' });
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

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await auth.forgotPassword(forgotEmail);
      setForgotSent(true);
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
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M4 9L8 5V15L4 19V9Z" fill="currentColor" opacity="0.85"/>
              <path d="M10 7L14 3V13L10 17V7Z" fill="currentColor"/>
              <path d="M16 11L20 7V17L16 21V11Z" fill="currentColor" opacity="0.85"/>
            </svg>
            <span className="text-xl font-bold tracking-tighter text-white">Balance OS</span>
          </div>
          <p className="text-sm text-[#A1A1AA]">CRM interno — Balance Consultores</p>
          {modoRegistro && (
            <p className="text-xs text-amber-400 mt-2 bg-amber-500/10 border border-amber-200 rounded-lg p-2">
              No hay usuarios registrados. Crea el primer usuario (admin).
            </p>
          )}
        </div>

        <form onSubmit={forgotMode ? handleForgot : (modoRegistro ? handleRegistro : handleSubmit)} 
              className="bg-[#141414] rounded-2xl p-6 shadow-[0_12px_32px_rgba(0,0,0,0.04)] border border-[#262626]">
          <h2 className="text-lg font-semibold text-white mb-5">
            {forgotMode ? 'Recuperar contraseña' : (modoRegistro ? 'Crear primer usuario' : 'Iniciar sesión')}
          </h2>

          {error && (
            <div className="bg-red-500/10 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>
          )}

          {forgotMode && forgotSent ? (
            <div className="bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] text-sm rounded-lg p-4">
              ✅ Si el email está registrado, recibirás un link.
            </div>
          ) : forgotMode ? (
            <div className="space-y-4">
              <p className="text-xs text-[#A1A1AA]">Ingresa tu email y te enviaremos un link para restablecer tu contraseña.</p>
              <input type="email" placeholder="Correo electrónico" value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)} required
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3.5 text-sm text-white outline-none transition-all duration-200 focus:border-[#10B981] placeholder:text-[#A1A1AA]"
              />
              <button type="submit" disabled={loading}
                className="w-full bg-[#10B981] text-white text-sm font-semibold rounded-xl py-3.5 transition-all duration-200 hover:bg-[#059669] disabled:opacity-50">
                {loading ? 'Enviando...' : 'Enviar link de recuperación'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {modoRegistro && (
                <input type="text" placeholder="Nombre completo" value={regNombre}
                  onChange={(e) => setRegNombre(e.target.value)} required
                  className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3.5 text-sm text-white outline-none transition-all duration-200 focus:border-[#10B981] focus:ring-2 focus:ring-[#2E8B57]/15 placeholder:text-[#A1A1AA]"
                />
              )}
              <input type="email" placeholder="Correo electrónico" value={modoRegistro ? regEmail : email}
                onChange={(e) => modoRegistro ? setRegEmail(e.target.value) : setEmail(e.target.value)} required
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3.5 text-sm text-white outline-none transition-all duration-200 focus:border-[#10B981] focus:ring-2 focus:ring-[#2E8B57]/15 placeholder:text-[#A1A1AA]"
              />
              <input type="password" placeholder="Contraseña" value={modoRegistro ? regPassword : password}
                onChange={(e) => modoRegistro ? setRegPassword(e.target.value) : setPassword(e.target.value)} required minLength={6}
                className="w-full bg-[#1A1A1A] border border-[#262626] rounded-xl p-3.5 text-sm text-white outline-none transition-all duration-200 focus:border-[#10B981] focus:ring-2 focus:ring-[#2E8B57]/15 placeholder:text-[#A1A1AA]"
              />
              <button type="submit" disabled={loading}
                className="w-full bg-[#0A0A0A] text-white text-sm font-semibold rounded-xl py-3.5 transition-all duration-200 hover:bg-slate-800 disabled:opacity-50">
                {loading ? 'Procesando...' : modoRegistro ? 'Crear y entrar' : 'Entrar'}
              </button>
            </div>
          )}

          {hayUsuarios && !forgotMode && (
            <div className="mt-4 text-center flex flex-col gap-2">
              <button type="button"
                onClick={() => { setModoRegistro(!modoRegistro); setError(''); }}
                className="text-xs text-[#A1A1AA] hover:text-[#D4D4D8] transition-colors">
                {modoRegistro ? '← Volver al inicio de sesión' : 'Registrar nuevo usuario'}
              </button>
              {!modoRegistro && (
                <button type="button"
                  onClick={() => { setForgotMode(true); setError(''); }}
                  className="text-xs text-[#A1A1AA] hover:text-[#F59E0B] transition-colors">
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </div>
          )}

          {forgotMode && (
            <div className="mt-4 text-center">
              <button type="button"
                onClick={() => { setForgotMode(false); setForgotSent(false); setError(''); }}
                className="text-xs text-[#A1A1AA] hover:text-[#D4D4D8] transition-colors">
                ← Volver al inicio de sesión
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
