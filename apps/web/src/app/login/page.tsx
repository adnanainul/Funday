'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed.');
      }
      
      // Clear old session
      sessionStorage.clear();
      
      localStorage.setItem('codebattle_user', JSON.stringify({ username: data.username, wins: data.wins }));
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col items-center justify-center p-8 font-sans">
      <Link href="/" className="absolute top-8 left-8 text-neutral-600 hover:text-neutral-400 text-sm transition-colors font-medium">← Back to Home</Link>
      
      <div className="w-full max-w-md bg-neutral-900 p-8 rounded-3xl border border-neutral-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
        
        <h1 className="text-3xl font-black text-center mb-2">WELCOME BACK</h1>
        <p className="text-neutral-500 text-center mb-8 text-sm">Login to continue your battles</p>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold tracking-widest text-neutral-500 mb-2">USERNAME</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="e.g. shadow_coder"
            />
          </div>
          <div>
            <label className="block text-xs font-bold tracking-widest text-neutral-500 mb-2">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="••••••••"
            />
          </div>
          
          {error && <div className="text-red-400 text-sm font-medium bg-red-400/10 p-3 rounded-xl border border-red-400/20">{error}</div>}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-neutral-950 font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] mt-4"
          >
            {loading ? 'LOGGING IN...' : 'LOGIN'}
          </button>
        </form>
        
        <p className="text-center mt-8 text-neutral-500 text-sm">
          Don't have an account? <Link href="/signup" className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
