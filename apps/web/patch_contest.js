const fs = require('fs');
let code = fs.readFileSync('src/app/contest/[id]/page.tsx', 'utf-8');

// 1. Add getSocket import
code = code.replace(`import Editor from '@monaco-editor/react';`, `import Editor from '@monaco-editor/react';\nimport { getSocket } from '@/lib/socket';`);

// 2. Add states for dynamic variables
code = code.replace(`  const [problemStatuses, setProblemStatuses] = useState<Record<string, string>>({});\n  const [myScore, setMyScore] = useState(0);`, `  const [problemStatuses, setProblemStatuses] = useState<Record<string, string>>({});\n  const [myScore, setMyScore] = useState(0);\n  const [participants, setParticipants] = useState(0);\n  const [liveLeaderboard, setLiveLeaderboard] = useState<any[]>([]);\n  const [timeRemaining, setTimeRemaining] = useState(2 * 60 * 60 * 1000); // ms`);

// 3. Connect socket in useEffect
const socketEffect = `
  useEffect(() => {
    const socket = getSocket();
    
    // Join global contest room
    socket.emit('join_contest', { username: myUsername });
    
    // Listen for updates
    socket.on('contest_update', (data) => {
      setParticipants(data.participants);
      setLiveLeaderboard(data.leaderboard);
      if (data.timeRemaining) setTimeRemaining(data.timeRemaining);
    });
    
    socket.on('contest_tick', (data) => {
      setTimeRemaining(data.timeRemaining);
    });
    
    return () => {
      socket.off('contest_update');
      socket.off('contest_tick');
    };
  }, [myUsername]);
`;
code = code.replace(`  useEffect(() => {\n    const user = JSON.parse(localStorage.getItem('codebattle_user') || '{}');`, socketEffect + `\n  useEffect(() => {\n    const user = JSON.parse(localStorage.getItem('codebattle_user') || '{}');`);

// 4. Update submit function to send username and socketId
code = code.replace(`        body: JSON.stringify({ code, language, problemId: activeProblem.id, roomId: '', socketId: '' }),`, `        body: JSON.stringify({ code, language, problemId: activeProblem.id, roomId: '', socketId: getSocket().id, username: myUsername }),`);

// 5. Replace mockLeaderboard with liveLeaderboard
code = code.replace(/  const mockLeaderboard = \[[\s\S]*?\]\.sort\(\(a, b\) => b\.score - a\.score\);/, `  const mockLeaderboard = liveLeaderboard.length > 0 ? liveLeaderboard : [];`);

// 6. Format time function
code = code.replace(`export default function LiveContest() {`, `function formatTime(ms: number) {\n  const totalSeconds = Math.floor(ms / 1000);\n  const hours = Math.floor(totalSeconds / 3600);\n  const minutes = Math.floor((totalSeconds % 3600) / 60);\n  const seconds = totalSeconds % 60;\n  if (hours > 0) return \`\${hours}:\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`;\n  return \`\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`;\n}\n\nexport default function LiveContest() {`);

// 7. Render dynamic time and participants (Header)
code = code.replace(/<div className="font-mono font-bold text-lg text-emerald-400">23:41<\/div>/g, `<div className="font-mono font-bold text-lg text-emerald-400">{formatTime(timeRemaining)}</div>`);
code = code.replace(/<div className="font-bold text-lg">128<\/div>/g, `<div className="font-bold text-lg">{participants || 1}</div>`);

fs.writeFileSync('src/app/contest/[id]/page.tsx', code);
