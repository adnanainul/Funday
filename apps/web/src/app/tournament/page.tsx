import Link from 'next/link';

export default function TournamentBracket() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 p-8 font-sans flex flex-col items-center">
      <h1 className="text-4xl font-black mb-12 flex items-center gap-4 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">
        <span className="text-5xl">⚔</span> 8-PLAYER KNOCKOUT
      </h1>
      
      <div className="flex w-full max-w-6xl justify-between items-center relative">
        
        {/* ROUND 1 */}
        <div className="flex flex-col gap-8 w-64 z-10">
          <h2 className="text-center font-bold text-neutral-500 mb-4">ROUND 1</h2>
          
          <MatchBox p1="Alex" p2="Sam" winner="Alex" />
          <MatchBox p1="John" p2="David" winner="John" />
          <MatchBox p1="Mike" p2="Ryan" winner="Mike" />
          <MatchBox p1="Chris" p2="Adam" winner="Chris" />
        </div>

        {/* SEMIFINALS */}
        <div className="flex flex-col justify-around h-[800px] w-64 z-10">
          <h2 className="text-center font-bold text-neutral-500 absolute top-12 w-64">SEMIFINAL</h2>
          
          <MatchBox p1="Alex" p2="John" winner="Alex" active />
          <MatchBox p1="Mike" p2="Chris" winner="-" active />
        </div>

        {/* FINAL */}
        <div className="flex flex-col justify-center h-[800px] w-80 z-10">
          <h2 className="text-center font-bold text-neutral-500 absolute top-12 w-80">FINAL</h2>
          
          <div className="bg-neutral-900 border-2 border-yellow-500/50 p-6 rounded-2xl shadow-[0_0_30px_-5px_rgba(234,179,8,0.3)]">
            <div className="text-center font-bold text-yellow-500 mb-4">GRAND FINAL</div>
            <div className="flex justify-between items-center font-bold text-xl">
              <span>Alex</span>
              <span className="text-neutral-500 text-sm">VS</span>
              <span className="text-neutral-500">?</span>
            </div>
          </div>
        </div>

      </div>

      <div className="mt-16">
         <Link href="/battle/arena?mode=tournament" className="px-12 py-4 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-black text-xl rounded-full transition-transform hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]">
           ENTER ARENA
         </Link>
      </div>

    </div>
  );
}

function MatchBox({ p1, p2, winner, active = false }: { p1: string, p2: string, winner: string, active?: boolean }) {
  return (
    <div className={`bg-neutral-900 border ${active ? 'border-emerald-500/50 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]' : 'border-neutral-800'} p-4 rounded-xl flex flex-col gap-2 relative`}>
      <div className={`flex justify-between items-center font-bold ${winner === p1 ? 'text-emerald-400' : winner && winner !== '-' ? 'text-neutral-600' : 'text-white'}`}>
        <span>{p1}</span>
        {winner === p1 && <span>✓</span>}
      </div>
      <div className="h-px bg-neutral-800 w-full my-1"></div>
      <div className={`flex justify-between items-center font-bold ${winner === p2 ? 'text-emerald-400' : winner && winner !== '-' ? 'text-neutral-600' : 'text-white'}`}>
        <span>{p2}</span>
        {winner === p2 && <span>✓</span>}
      </div>
    </div>
  );
}
