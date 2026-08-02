import { useState } from 'react'
import { Bot } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/hooks/useLanguage'
import type { Lang } from '@/lib/i18n'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { t, lang, setLang } = useLanguage()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(t('loginError'))
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 bg-amber-400/10 rounded-2xl flex items-center justify-center">
            <Bot className="text-amber-400" size={32} />
          </div>
          <h1 className="text-white text-2xl font-bold">RELMO Hub</h1>
          <p className="text-slate-400 text-sm">{t('loginTitle')}</p>
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 text-xs font-medium">
            {(['nl', 'fr'] as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1.5 rounded-md transition-colors ${lang === l ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">{t('email')}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400"
              placeholder="info@relmotech.be"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">{t('password')}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-400 text-slate-900 font-semibold rounded-xl text-sm disabled:opacity-50 hover:bg-amber-300 transition-colors"
          >
            {loading ? t('loggingIn') : t('loginBtn')}
          </button>
        </form>
      </div>
    </div>
  )
}
