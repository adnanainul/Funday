'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:4000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }
      
      // Clear old session
      sessionStorage.clear();
      
      localStorage.setItem('codebattle_user', JSON.stringify({ username: data.username, wins: 0 }));
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
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
        
        <h1 className="text-3xl font-black text-center mb-2">JOIN BATTLE</h1>
        <p className="text-neutral-500 text-center mb-8 text-sm">Create an account to start winning</p>
        
        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label className="block text-xs font-bold tracking-widest text-neutral-500 mb-2">USERNAME</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="e.g. byte_master"
            />
          </div>
          <div>
            <label className="block text-xs font-bold tracking-widest text-neutral-500 mb-2">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="••••••••"
            />
          </div>
          
          {error && <div className="text-red-400 text-sm font-medium bg-red-400/10 p-3 rounded-xl border border-red-400/20">{error}</div>}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] mt-4"
          >
            {loading ? 'CREATING ACCOUNT...' : 'SIGN UP'}
          </button>
        </form>
        
        <p className="text-center mt-8 text-neutral-500 text-sm">
          Already have an account? <Link href="/login" className="text-purple-400 hover:text-purple-300 font-bold transition-colors">Log in</Link>
        </p>
      </div>
    </div>
  );
}
