'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Profile() {
  const [profile, setProfile] = useState<{ username: string; wins: number; createdAt: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem('codebattle_user');
    if (!userStr) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(userStr);

    fetch(`http://localhost:4000/api/profile/${user.username}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load profile');
        return res.json();
      })
      .then(data => {
        setProfile(data);
        // Sync local storage wins
        localStorage.setItem('codebattle_user', JSON.stringify({ username: data.username, wins: data.wins }));
      })
      .catch(err => {
        console.error(err);
        // If error, maybe user doesn't exist anymore on server restart
        router.push('/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('codebattle_user');
    sessionStorage.clear();
    router.push('/login');
  };

  if (loading) return <div className="min-h-screen bg-neutral-950 flex justify-center items-center text-white">Loading profile...</div>;
  if (!profile) return null;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col items-center justify-center p-8 font-sans">
      <Link href="/" className="absolute top-8 left-8 text-neutral-600 hover:text-neutral-400 text-sm transition-colors font-medium">← Back to Home</Link>
      
      <div className="w-full max-w-md bg-neutral-900 p-8 rounded-3xl border border-neutral-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-rose-500"></div>
        
        <div className="flex flex-col items-center mb-8 mt-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-rose-600 shadow-[0_0_0_4px_rgba(0,0,0,1),0_0_0_6px_rgba(244,63,94,0.4)] mb-6 flex items-center justify-center text-4xl font-black">
            {profile.username.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-3xl font-black">{profile.username}</h1>
          <p className="text-neutral-500 mt-2 text-sm">Joined {new Date(profile.createdAt).toLocaleDateString()}</p>
        </div>

        <div className="bg-neutral-950 rounded-2xl p-6 border border-neutral-800 mb-8 flex flex-col items-center">
          <span className="text-neutral-500 text-xs font-bold tracking-widest mb-2">TOTAL WINS</span>
          <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-300 to-orange-500">
            {profile.wins}
          </span>
          <span className="text-neutral-600 text-sm mt-4 italic text-center">
            {profile.wins === 0 ? "You haven't won any battles yet. Time to code!" : "Keep up the great work!"}
          </span>
        </div>
        
        <button
          onClick={handleLogout}
          className="w-full border-2 border-neutral-800 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 text-neutral-500 font-bold py-4 rounded-xl transition-all"
        >
          LOG OUT
        </button>
      </div>
    </div>
  );
}
