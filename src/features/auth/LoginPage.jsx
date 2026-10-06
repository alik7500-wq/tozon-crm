import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { TozonLogo } from '../../components/TozonLogo';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export const LoginPage = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to root
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email.trim().toLowerCase(), password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Неверный логин или пароль');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-12">
      {/* Subtle soft backdrop accents */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-tozon-blue/10 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-tozon-red/10 blur-[100px] pointer-events-none" />

      {/* Grid subtle background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <TozonLogo size="lg" className="mb-4" />
          <p className="mt-1 text-xs text-slate-500 font-medium max-w-xs">
            Единая корпоративная CRM-платформа управления продажами недвижимости
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl bg-white p-8 shadow-xl border border-slate-200/80">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900">Вход в систему</h2>
            <span className="flex items-center gap-1 text-[11px] font-bold text-tozon-blue-700 bg-tozon-blue-50 px-2.5 py-1 rounded-full border border-tozon-blue-200">
              <ShieldCheck className="h-3.5 w-3.5" /> Enterprise Core
            </span>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Электронная почта
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@tozon.crm"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-10 py-2.5 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition focus:border-tozon-blue focus:bg-white focus:ring-4 focus:ring-tozon-blue/10"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-10 py-2.5 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition focus:border-tozon-blue focus:bg-white focus:ring-4 focus:ring-tozon-blue/10"
                />
              </div>
            </div>

            {/* Primary Action Button in TOZON RED */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-tozon-red px-4 py-3 text-xs font-black text-white shadow-md shadow-tozon-red/20 transition hover:bg-tozon-red-hover focus:outline-none focus:ring-4 focus:ring-tozon-red/20 disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>Войти в систему</span>
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="mt-6 text-center text-[11px] text-slate-400 font-bold">
          TOZON CRM • Real Estate Corporate Management System
        </p>
      </div>
    </div>
  );
};

