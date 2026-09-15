'use client';
import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { getSocket } from '@/lib/socket';

const LANGUAGE_MAP: Record<string, string> = {
  python: 'python',
  cpp: 'cpp',
  java: 'java',
};

type Problem = {
  id: string;
  title: string;
  description: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  constraints: string[];
  difficulty: string;
  functionName: string;
  templates: { javascript: string; python: string; cpp: string; java: string };
};

type OutputStatus = 'idle' | 'running' | 'accepted' | 'wrong' | 'error' | 'tle';
type Tab = 'problems' | 'editor' | 'leaderboard';

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default function LiveContest() {
  const [tab, setTab] = useState<Tab>('editor');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [activeProblemId, setActiveProblemId] = useState<string>('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [myUsername, setMyUsername] = useState('Player6948');

  const [outputStatus, setOutputStatus] = useState<OutputStatus>('idle');
  const [outputText, setOutputText] = useState('');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [problemStatuses, setProblemStatuses] = useState<Record<string, string>>({});
  const [myScore, setMyScore] = useState(0);
  const [participants, setParticipants] = useState(0);
  const [liveLeaderboard, setLiveLeaderboard] = useState<any[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(2 * 60 * 60 * 1000); // ms


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

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem('codebattle_user') || '{}');
    if (user.username) setMyUsername(user.username);

    fetch('http://localhost:4000/api/problems')
      .then(res => res.json())
      .then((data: Problem[]) => {
        if (data && data.length > 0) {
          setProblems(data);
          setActiveProblemId(data[0].id);
          const templates = data[0].templates as any;
          setCode(templates['python'] || '');
        }
      })
      .catch(err => console.error('Failed to fetch problems', err));
  }, []);

  const activeProblem = problems.find(p => p.id === activeProblemId);

  useEffect(() => {
    if (activeProblem) {
      const templates = activeProblem.templates as any;
      setCode(templates[language] || '');
      setOutputStatus('idle');
      setOutputText('');
      setTestResults([]);
    }
  }, [activeProblemId, language]);

  const handleSelectProblem = (id: string) => {
    setActiveProblemId(id);
    setTab('editor');
  };

  const handleRun = async () => {
    if (!activeProblem) return;
    setOutputStatus('running');
    setOutputText('Running...');
    setTestResults([]);
    try {
      const res = await fetch('http://localhost:4000/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, problemId: activeProblem.id }),
      });
      const data = await res.json();
      setTestResults(data.results || []);
      if (data.status === 'Accepted') {
        setOutputStatus('accepted');
        setOutputText(`All ${data.passed}/${data.total} sample cases passed!`);
      } else if (data.status === 'Time Limit Exceeded') {
        setOutputStatus('tle');
        setOutputText('Time Limit Exceeded');
      } else if (data.error) {
        setOutputStatus('error');
        setOutputText(data.error);
      } else {
        setOutputStatus('wrong');
        setOutputText(`Wrong Answer: ${data.passed}/${data.total} passed.`);
      }
    } catch {
      setOutputStatus('error');
      setOutputText('Failed to connect to server.');
    }
  };

  const handleSubmit = async () => {
    if (!activeProblem) return;
    setOutputStatus('running');
    setOutputText('Submitting...');
    setTestResults([]);
    try {
      const res = await fetch('http://localhost:4000/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, problemId: activeProblem.id, roomId: '', socketId: getSocket().id, username: myUsername }),
      });
      const data = await res.json();
      setTestResults(data.results || []);
      if (data.status === 'Accepted') {
        setOutputStatus('accepted');
        setOutputText(`ACCEPTED! ${data.passed}/${data.total} test cases passed!`);
        if (problemStatuses[activeProblem.id] !== '✅') {
          setProblemStatuses(prev => ({ ...prev, [activeProblem.id]: '✅' }));
          setMyScore(prev => prev + 100);
        }
      } else if (data.status === 'Time Limit Exceeded') {
        setOutputStatus('tle');
        setOutputText('Time Limit Exceeded.');
        setProblemStatuses(prev => ({ ...prev, [activeProblem.id]: '❌' }));
      } else if (data.error) {
        setOutputStatus('error');
        setOutputText(data.error);
        setProblemStatuses(prev => ({ ...prev, [activeProblem.id]: '❌' }));
      } else {
        setOutputStatus('wrong');
        setOutputText(`Wrong Answer: ${data.passed}/${data.total} passed.`);
        setProblemStatuses(prev => ({ ...prev, [activeProblem.id]: '❌' }));
      }
    } catch {
      setOutputStatus('error');
      setOutputText('Submission failed.');
    }
  };

  const mockLeaderboard = liveLeaderboard.length > 0 ? liveLeaderboard : [];

  const statusColor: Record<OutputStatus, string> = {
    idle: 'text-neutral-500', running: 'text-yellow-400',
    accepted: 'text-emerald-400', wrong: 'text-red-400',
    error: 'text-red-400', tle: 'text-orange-400',
  };
  const statusBorder: Record<OutputStatus, string> = {
    idle: 'border-neutral-800', running: 'border-neutral-800',
    accepted: 'border-emerald-700', wrong: 'border-red-800',
    error: 'border-red-800', tle: 'border-orange-700',
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'problems', label: 'Problems', icon: '📋' },
    { id: 'editor', label: 'Code Editor', icon: '💻' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  ];

  return (
    <div className="h-screen bg-[#0d0d0f] text-neutral-50 flex flex-col font-sans overflow-hidden">

      {/* ── HEADER ── */}
      <header className="h-14 bg-[#111113] border-b border-neutral-800/60 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="font-black text-base flex items-center gap-2 tracking-tight shrink-0">
            <span>🔥</span> FRIDAY NIGHT CODE BATTLE
          </h1>

          {/* Tab Navigation */}
          <nav className="flex items-center gap-1 bg-neutral-900 rounded-lg p-1">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all flex items-center gap-1.5 ${
                  tab === t.id
                    ? 'bg-neutral-700 text-white shadow'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
                {t.id === 'problems' && Object.keys(problemStatuses).length > 0 && (
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 rounded-full">
                    {Object.values(problemStatuses).filter(s => s === '✅').length}/{problems.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-center">
            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Time Left</div>
            <div className="font-mono font-bold text-lg text-emerald-400">{formatTime(timeRemaining)}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Players</div>
            <div className="font-bold text-lg">{participants || 1}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">My Score</div>
            <div className="font-bold text-lg text-emerald-400">{myScore}</div>
          </div>
        </div>
      </header>

      {/* ── PAGE: PROBLEMS ── */}
      {tab === 'problems' && (
        <div className="flex-1 overflow-y-auto p-8" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-2">Problems</h2>
            <p className="text-neutral-500 text-sm mb-6">Click a problem to open the editor.</p>

            <div className="space-y-3">
              {problems.map((p, idx) => {
                const letter = String.fromCharCode(65 + idx);
                const status = problemStatuses[p.id];
                const isActive = activeProblemId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProblem(p.id)}
                    className={`w-full text-left rounded-xl border p-5 transition-all group ${
                      status === '✅' ? 'border-emerald-700/50 bg-emerald-950/20 hover:bg-emerald-950/40' :
                      status === '❌' ? 'border-red-800/50 bg-red-950/20 hover:bg-red-950/40' :
                      isActive ? 'border-blue-700/50 bg-blue-950/20 hover:bg-blue-950/40' :
                      'border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800/80 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-black text-neutral-700 group-hover:text-neutral-500 transition-colors w-8">{letter}</span>
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-lg">{p.title}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {status === '✅' && <span className="text-2xl">✅</span>}
                        {status === '❌' && <span className="text-2xl">❌</span>}
                        {!status && (
                          <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-400 group-hover:bg-neutral-700 group-hover:text-white transition-colors">
                            Solve →
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── PAGE: EDITOR ── */}
      {tab === 'editor' && (
        <div className="flex-1 flex overflow-hidden">

          {/* Problem Description */}
          <div className="w-1/2 shrink-0 flex flex-col border-r border-neutral-800/60 overflow-hidden bg-[#111113]">
            <div className="flex-1 overflow-y-auto px-6 py-5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
              {activeProblem ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => setTab('problems')}
                      className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
                    >
                      ← All Problems
                    </button>
                  </div>
                  <h2 className="text-xl font-bold mb-4">{activeProblem.title}</h2>
                  <p className="text-neutral-300 text-sm leading-relaxed mb-6 whitespace-pre-line">{activeProblem.description}</p>

                  <div className="space-y-3 mb-6">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Examples</h3>
                    {activeProblem.examples.map((ex, i) => (
                      <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 font-mono text-xs space-y-1.5">
                        <div><span className="text-neutral-500">Input: </span><span className="text-neutral-200">{ex.input}</span></div>
                        <div><span className="text-neutral-500">Output: </span><span className="text-emerald-400">{ex.output}</span></div>
                        {ex.explanation && <div><span className="text-neutral-500">Explanation: </span><span className="text-neutral-400">{ex.explanation}</span></div>}
                      </div>
                    ))}
                  </div>

                  {activeProblem.constraints && activeProblem.constraints.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Constraints</h3>
                      <ul className="space-y-1">
                        {activeProblem.constraints.map((c, i) => (
                          <li key={i} className="text-xs text-neutral-400 font-mono flex gap-2"><span className="text-neutral-600">•</span>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-neutral-600">Loading...</div>
              )}
            </div>
          </div>

          {/* Editor + Output */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
            {/* Editor toolbar */}
            <div className="h-11 bg-[#252526] border-b border-[#333] flex items-center px-4 shrink-0 gap-3">
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="bg-[#3c3c3c] text-neutral-200 text-sm px-3 py-1 rounded outline-none border border-[#444] font-medium cursor-pointer"
              >
                <option value="python">Python</option>
                <option value="cpp">C++</option>
                <option value="java">Java</option>
              </select>
              <span className="text-xs text-[#555]">|</span>
              <span className="text-xs text-[#666]">{activeProblem?.title}</span>
            </div>

            {/* Monaco Editor */}
            <div className="flex-1 min-h-0">
              <Editor
                height="100%"
                language={LANGUAGE_MAP[language] || 'python'}
                theme="vs-dark"
                value={code}
                onChange={(v) => setCode(v || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  padding: { top: 16, bottom: 16 },
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                }}
              />
            </div>

            {/* Output Panel */}
            <div className={`shrink-0 border-t ${statusBorder[outputStatus]} transition-all ${outputStatus !== 'idle' ? 'h-48' : 'h-14'} bg-[#1e1e1e]`}>
              {outputStatus === 'idle' ? (
                <div className="h-full flex items-center justify-between px-4">
                  <span className="text-xs text-neutral-600">Run your code to see results</span>
                  <div className="flex gap-3">
                    <button onClick={handleRun} className="px-5 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white font-bold rounded text-sm transition-colors flex items-center gap-2">
                      ▶ RUN
                    </button>
                    <button onClick={handleSubmit} className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-sm transition-colors flex items-center gap-2 shadow-[0_0_12px_-2px_rgba(5,150,105,0.5)]">
                      ⚡ SUBMIT
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-[#333] shrink-0">
                    <div className={`font-bold text-sm ${statusColor[outputStatus]}`}>
                      {outputStatus === 'running' ? <span className="animate-pulse">⏳ Running...</span> : <span>{outputText}</span>}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={handleRun} disabled={outputStatus === 'running'} className="px-4 py-1 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-40 text-white font-bold rounded text-xs">
                        ▶ RUN
                      </button>
                      <button onClick={handleSubmit} disabled={outputStatus === 'running'} className="px-4 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded text-xs shadow-[0_0_10px_-2px_rgba(5,150,105,0.5)]">
                        ⚡ SUBMIT
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
                    {testResults.map((r, i) => (
                      <div key={i} className={`rounded-lg border p-3 font-mono text-xs ${r.passed ? 'bg-emerald-950/50 border-emerald-800/50 text-emerald-300' : 'bg-red-950/50 border-red-800/50 text-red-300'}`}>
                        <div className="font-bold mb-1">{r.passed ? '✓' : '✗'} Case {i + 1}: {r.passed ? 'Passed' : 'Failed'}</div>
                        {!r.passed && (
                          <div className="space-y-0.5 text-[11px] opacity-90">
                            <div><span className="text-neutral-500">Input:</span> {r.input}</div>
                            <div><span className="text-neutral-500">Expected:</span> {r.expected}</div>
                            {r.got && <div><span className="text-neutral-500">Got:</span> {r.got}</div>}
                            {r.error && <div className="text-red-400 mt-1 whitespace-pre-wrap break-words">{r.error}</div>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PAGE: LEADERBOARD ── */}
      {tab === 'leaderboard' && (
        <div className="flex-1 overflow-y-auto p-8" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold">Live Leaderboard</h2>
              <span className="flex items-center gap-2 text-xs text-neutral-500">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                Live
              </span>
            </div>
            <p className="text-neutral-500 text-sm mb-6">Ranked by score. +100 points per solved problem.</p>

            <div className="space-y-2">
              {mockLeaderboard.map((user, idx) => {
                const isMe = user.name === myUsername;
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <div
                    key={user.name}
                    className={`flex items-center justify-between rounded-xl border p-4 transition-all ${
                      isMe
                        ? 'border-emerald-700/50 bg-emerald-950/25'
                        : 'border-neutral-800 bg-neutral-900/40 hover:bg-neutral-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 text-center text-xl">
                        {idx < 3 ? medals[idx] : <span className="text-neutral-600 font-mono text-sm font-bold">{idx + 1}</span>}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-base ${isMe ? 'text-emerald-300' : ''}`}>{user.name}</span>
                          {isMe && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">YOU</span>}
                        </div>
                        <div className="text-xs text-neutral-500 mt-0.5">{user.solved} problem{user.solved !== 1 ? 's' : ''} solved</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-black text-xl text-emerald-400">{user.score}</div>
                      <div className="text-[10px] text-neutral-600">points</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
