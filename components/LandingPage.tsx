import React, { useState } from 'react';
import { Sparkles, ArrowRight, Mail, Lock, Loader2, LogIn, UserPlus } from './Icons';
import { supabase } from '../services/supabaseClient';

export const LandingPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
    }
    setLoading(false);
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      alert('¡Revisa tu correo para el enlace de confirmación!');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden font-sans selection:bg-purple-500/30">
      {/* Background effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] animate-pulse delay-1000"></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center space-y-8 max-w-md w-full animate-in fade-in slide-in-from-bottom-8 duration-700">

        {/* Header Section */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 bg-[#1e293b] rounded-3xl flex items-center justify-center shadow-2xl border border-slate-700 transform rotate-3">
              <img src="logo_oscuro.png" alt="Finzo" className="w-16 h-16 object-contain" />
            </div>
            <div className="absolute -top-4 -right-4 w-12 h-12 bg-[#1e293b] rounded-2xl flex items-center justify-center shadow-xl border border-slate-700 transform -rotate-6 animate-bounce">
              <Sparkles className="text-purple-400 w-6 h-6" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
              Fin<span className="text-blue-500">zo</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Tu gestor personal de tarjetas y gastos. <br />
              Simple, moderno e inteligente.
            </p>
          </div>
        </div>

        {/* Auth Form */}
        <div className="w-full bg-[#1e293b]/50 backdrop-blur-xl border border-slate-700 p-8 rounded-3xl shadow-2xl">
          <div className="flex gap-2 mb-6 p-1 bg-slate-900/50 rounded-xl">
            <button
              onClick={() => setIsRegister(false)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${!isRegister ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => setIsRegister(true)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${isRegister ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="email"
                  placeholder="hola@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 pl-12 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-wider">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 pl-12 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {errorMsg}
              </div>
            )}

            <button
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {isRegister ? <UserPlus size={20} /> : <LogIn size={20} />}
                  <span>{isRegister ? 'Crear Cuenta' : 'Ingresar'}</span>
                </>
              )}
            </button>
          </form>
        </div>

      </div>

      {/* Footer Badge */}
      <div className="absolute bottom-8 text-slate-600 text-xs uppercase tracking-widest font-semibold opacity-50">
        Potenciado con IA
      </div>
    </div>
  );
};