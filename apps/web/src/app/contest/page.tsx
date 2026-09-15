import Link from 'next/link';

export default function ContestList() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col items-center p-8 font-sans">
      <div className="max-w-4xl w-full space-y-8 mt-12">
        <h1 className="text-4xl font-black flex items-center gap-4">
          <span className="text-5xl">🏆</span> CONTESTS
        </h1>

        <div className="space-y-4">
          
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 hover:border-neutral-700 transition-colors">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                🔥 FRIDAY NIGHT CODE BATTLE
              </h2>
              <div className="text-neutral-400 mt-2 flex gap-4 text-sm font-medium">
                <span>Starts: 8:00 PM</span>
                <span>•</span>
                <span>Duration: 30 minutes</span>
                <span>•</span>
                <span>5 EASY DSA problems</span>
              </div>
            </div>
            
            <Link 
              href="/contest/friday-night"
              className="w-full md:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold rounded-xl transition-transform hover:scale-105 active:scale-95 text-center whitespace-nowrap"
            >
              JOIN CONTEST
            </Link>
          </div>

          <div className="bg-neutral-900/50 border border-neutral-800/50 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 opacity-75">
            <div>
              <h2 className="text-2xl font-bold">Weekly Beginner Sprint</h2>
              <div className="text-neutral-500 mt-2 flex gap-4 text-sm font-medium">
                <span>Ended 2 days ago</span>
                <span>•</span>
                <span>1243 Participants</span>
              </div>
            </div>
            
            <button disabled className="w-full md:w-auto px-8 py-4 bg-neutral-800 text-neutral-500 font-bold rounded-xl cursor-not-allowed">
              COMPLETED
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
