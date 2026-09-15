'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Editor from '@monaco-editor/react';
import { getSocket } from '@/lib/socket';

const LANGUAGE_MAP: Record<string, string> = {
  javascript: 'javascript',
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
};

type OutputStatus = 'idle' | 'running' | 'accepted' | 'wrong' | 'error' | 'tle';

function formatTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function Arena() {
  const searchParams = useSearchParams();
  const code_param = searchParams.get('code') || '';
  const router = useRouter();

  const [problem, setProblem] = useState<Problem | null>(null);
  const [myUsername, setMyUsername] = useState('');
  const [opponentUsername, setOpponentUsername] = useState('Opponent');
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(300000); // 5 min
  const [opponentStatus, setOpponentStatus] = useState('coding...');
  const [outputStatus, setOutputStatus] = useState<OutputStatus>('idle');
  const [outputText, setOutputText] = useState('');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [battleResult, setBattleResult] = useState<{ won: boolean; winnerUsername: string; reason?: string } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const socketId = useRef<string>('');

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem('codebattle_user') || '{}');
    const roomData = JSON.parse(sessionStorage.getItem('codebattle_room') || '{}');
    setMyUsername(user.username || 'You');
    setOpponentUsername(roomData.opponentUsername || 'Opponent');

    if (roomData.problem) {
      const p = roomData.problem;
      setProblem(p);
      
      const templates = p.templates || {};
      const template = templates[language] || `function ${p.functionName}() {\n  \n}`;
      setCode(template);
    }

    const socket = getSocket();
    socketId.current = socket.id || '';

    // Listen for timer ticks from server
    const onTimerTick = ({ remaining }: any) => {
      setTimeRemaining(remaining);
    };

    // Opponent activity
    const onOpponentTyping = () => {
      setOpponentStatus('typing...');
    };
    const onOpponentRunning = () => {
      setOpponentStatus('running code...');
    };
    const onOpponentSubmitted = () => {
      setOpponentStatus('submitted!');
    };
    const onOpponentDisconnected = () => {
      setOpponentStatus('disconnected');
    };

    // Battle end
    const onBattleEnd = ({ winnerId, winnerUsername, reason }: any) => {
      if (timerRef.current) clearInterval(timerRef.current);
      const won = winnerUsername === user.username;
      setBattleResult({ won, winnerUsername: winnerUsername || 'Nobody', reason });
      setShowResult(true);
    };

    socket.on('timer_tick', onTimerTick);
    socket.on('opponent_typing', onOpponentTyping);
    socket.on('opponent_running', onOpponentRunning);
    socket.on('opponent_submitted', onOpponentSubmitted);
    socket.on('opponent_disconnected', onOpponentDisconnected);
    socket.on('battle_end', onBattleEnd);

    return () => {
      socket.off('timer_tick', onTimerTick);
      socket.off('opponent_typing', onOpponentTyping);
      socket.off('opponent_running', onOpponentRunning);
      socket.off('opponent_submitted', onOpponentSubmitted);
      socket.off('opponent_disconnected', onOpponentDisconnected);
      socket.off('battle_end', onBattleEnd);
    };
  }, []);

  // Update code template when language changes
  useEffect(() => {
    if (problem) {
      const templates = problem.templates as any || {};
      const template = templates[language] || `function ${problem.functionName}() {\n  \n}`;
      setCode(template);
    }
  }, [language, problem]);

  const handleCodeChange = useCallback((val: string | undefined) => {
    setCode(val || '');
    // Debounce typing notification
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      const socket = getSocket();
      socket.emit('typing', { roomId: code_param });
    }, 500);
  }, [code_param]);

  const handleRun = async () => {
    if (!problem || isRunning) return;
    setIsRunning(true);
    setOutputStatus('running');
    setOutputText('Running against sample test cases...');
    setTestResults([]);

    const socket = getSocket();
    socket.emit('opponent_running_notify', { roomId: code_param }); // will be ignored, just for opponent

    try {
      const res = await fetch('http://localhost:4000/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, problemId: problem.id }),
      });
      const data = await res.json();
      setTestResults(data.results || []);

      if (data.status === 'Accepted') {
        setOutputStatus('accepted');
        setOutputText(`✓ All ${data.passed}/${data.total} sample test cases passed!`);
      } else if (data.status === 'Time Limit Exceeded') {
        setOutputStatus('tle');
        setOutputText('⏱ Time Limit Exceeded — your code took too long.');
      } else if (data.error) {
        setOutputStatus('error');
        setOutputText(`❌ ${data.status}\n\n${data.error}`);
      } else {
        setOutputStatus('wrong');
        setOutputText(`✗ ${data.passed}/${data.total} sample test cases passed.`);
      }
    } catch {
      setOutputStatus('error');
      setOutputText('❌ Failed to connect to execution server. Make sure the server is running.');
    }
    setIsRunning(false);
  };

  const handleSubmit = async () => {
    if (!problem || isSubmitting) return;
    setIsSubmitting(true);
    setOutputStatus('running');
    setOutputText('Submitting... running all test cases...');
    setTestResults([]);

    const socket = getSocket();
    socket.emit('opponent_submitted_notify', { roomId: code_param });

    try {
      const res = await fetch('http://localhost:4000/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          problemId: problem.id,
          roomId: code_param,
          socketId: socket.id,
        }),
      });
      const data = await res.json();
      setTestResults(data.results || []);

      if (data.status === 'Accepted') {
        setOutputStatus('accepted');
        setOutputText(`🏆 ACCEPTED! All ${data.passed}/${data.total} test cases passed!`);
        // battle_end will come via socket
      } else if (data.status === 'Time Limit Exceeded') {
        setOutputStatus('tle');
        setOutputText('⏱ Time Limit Exceeded.');
      } else if (data.error) {
        setOutputStatus('error');
        setOutputText(`❌ ${data.status}\n\n${data.error}`);
      } else {
        setOutputStatus('wrong');
        setOutputText(`✗ Wrong Answer: ${data.passed}/${data.total} test cases passed. Keep trying!`);
      }
    } catch {
      setOutputStatus('error');
      setOutputText('❌ Submission failed. Please try again.');
    }
    setIsSubmitting(false);
  };

  const outputStatusColors: Record<OutputStatus, string> = {
    idle: 'text-neutral-500',
    running: 'text-yellow-400',
    accepted: 'text-emerald-400',
    wrong: 'text-red-400',
    error: 'text-red-400',
    tle: 'text-orange-400',
  };

  // ---- RESULT SCREEN ----
  if (showResult && battleResult) {
    const { won, winnerUsername, reason } = battleResult;
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-8 relative overflow-hidden font-sans">
        <div className={`absolute inset-0 ${won ? 'bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08),transparent_70%)]' : 'bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.05),transparent_70%)]'}`}></div>

        <div className="z-10 text-center space-y-6 max-w-lg">
          <div className="text-7xl mb-2">{won ? '🏆' : '😤'}</div>
          <h1 className={`text-6xl font-black ${won ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600' : 'text-neutral-400'}`}>
            {won ? 'VICTORY!' : 'DEFEAT'}
          </h1>
          <h2 className="text-2xl font-bold text-white">
            {reason || (won ? `${winnerUsername} won the battle!` : `${winnerUsername} was faster!`)}
          </h2>

          {won && (
            <div className="bg-emerald-500/10 text-emerald-400 px-6 py-3 rounded-full border border-emerald-500/20 font-bold text-lg inline-flex items-center gap-2 mx-auto">
              <span>⚡</span> First Correct Submission! <span>+10 ⚡</span>
            </div>
          )}
          {!won && winnerUsername !== 'Nobody' && (
            <p className="text-neutral-600 text-lg font-medium">{winnerUsername} solved it first. Better luck next time! <span>-8 ⚡</span></p>
          )}

          <div className="pt-6 flex gap-4 justify-center flex-wrap">
            <button
              onClick={() => { setShowResult(false); setBattleResult(null); setOutputStatus('idle'); setOutputText(''); setTestResults([]); }}
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold rounded-2xl transition-transform hover:scale-105 active:scale-95"
            >
              REMATCH 🔄
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-8 py-4 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-2xl transition-transform hover:scale-105 active:scale-95 border border-neutral-700"
            >
              BACK TO BATTLEGROUND
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- ARENA ----
  return (
    <div className="h-screen bg-neutral-950 text-neutral-50 flex flex-col font-sans overflow-hidden">

      {/* TOP BAR */}
      <header className="h-14 bg-neutral-900/80 backdrop-blur border-b border-neutral-800 flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center gap-3 w-72">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shrink-0"></div>
          <div className="min-w-0">
            <div className="font-bold text-sm truncate">{myUsername} <span className="text-neutral-600 font-normal">(You)</span></div>
            <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Connected
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-lg font-black text-neutral-600">⚔</div>
          <div className={`text-xl font-mono font-bold tabular-nums ${timeRemaining < 60000 ? 'text-red-400' : 'text-white'}`}>
            {formatTime(timeRemaining)}
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end w-72">
          <div className="min-w-0 text-right">
            <div className="font-bold text-sm truncate">{opponentUsername}</div>
            <div className="text-xs text-yellow-400 font-semibold flex items-center gap-1 justify-end">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> {opponentStatus}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 shrink-0"></div>
        </div>
      </header>

      {/* SPLIT BATTLEFIELD */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT: PROBLEM */}
        <div className="w-[45%] flex flex-col border-r border-neutral-800 overflow-y-auto bg-neutral-950" style={{scrollbarWidth:'thin',scrollbarColor:'#333 transparent'}}>
          {problem ? (
            <div className="p-7 space-y-5">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{problem.title}</h1>
              </div>

              <div className="text-neutral-300 text-sm leading-relaxed whitespace-pre-line">
                {problem.description}
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-neutral-200">Examples</h3>
                {problem.examples.map((ex, i) => (
                  <div key={i} className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl font-mono text-xs space-y-1">
                    <div><span className="text-neutral-500">Input:</span> <span className="text-neutral-200">{ex.input}</span></div>
                    <div><span className="text-neutral-500">Output:</span> <span className="text-emerald-400">{ex.output}</span></div>
                    {ex.explanation && <div><span className="text-neutral-500">Explanation:</span> <span className="text-neutral-400">{ex.explanation}</span></div>}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-neutral-200">Constraints</h3>
                <ul className="list-disc pl-5 text-neutral-500 font-mono text-xs space-y-1">
                  {problem.constraints.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>

              {/* Output panel */}
              {outputStatus !== 'idle' && (
                <div className={`rounded-xl border p-4 space-y-3 ${outputStatus === 'accepted' ? 'bg-emerald-500/5 border-emerald-500/20' : outputStatus === 'wrong' || outputStatus === 'error' || outputStatus === 'tle' ? 'bg-red-500/5 border-red-500/20' : 'bg-neutral-900 border-neutral-800'}`}>
                  <div className={`font-bold text-sm ${outputStatusColors[outputStatus]}`}>
                    {outputStatus === 'running' && <span className="animate-pulse">⏳ Running...</span>}
                    {outputStatus !== 'running' && outputText}
                  </div>
                  {testResults.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {testResults.map((r, i) => (
                        <div key={i} className={`p-2 rounded-lg font-mono text-xs ${r.passed ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
                          <div>Case {i+1}: {r.passed ? '✓ Passed' : '✗ Failed'}</div>
                          {!r.passed && (
                            <>
                              <div>Input: {r.input}</div>
                              <div>Expected: {r.expected}</div>
                              {r.got && <div>Got: {r.got}</div>}
                              {r.error && <div>Error: {r.error}</div>}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-600">
              Loading problem...
            </div>
          )}
        </div>

        {/* RIGHT: EDITOR */}
        <div className="flex-1 flex flex-col bg-[#1e1e1e] min-w-0">

          {/* Editor toolbar */}
          <div className="h-11 bg-[#252526] border-b border-[#333] flex items-center px-4 justify-between shrink-0">
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="bg-[#3c3c3c] text-neutral-200 text-sm px-3 py-1.5 rounded outline-none border border-[#444] font-medium cursor-pointer"
            >
              <option value="python">Python</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
            </select>

            <div className="text-xs text-neutral-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              {opponentUsername}: {opponentStatus}
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 relative min-h-0">
            <Editor
              height="100%"
              language={LANGUAGE_MAP[language] || 'javascript'}
              theme="vs-dark"
              value={code}
              onChange={handleCodeChange}
              options={{
                minimap: { enabled: false },
                fontSize: 15,
                fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
                fontLigatures: true,
                scrollBeyondLastLine: false,
                padding: { top: 16, bottom: 16 },
                lineNumbers: 'on',
                renderLineHighlight: 'line',
                cursorBlinking: 'smooth',
                smoothScrolling: true,
                wordWrap: 'on',
              }}
            />
          </div>

          {/* Action buttons */}
          <div className="h-14 bg-[#252526] border-t border-[#333] flex items-center px-5 justify-between shrink-0">
            <span className="text-xs text-neutral-600 font-mono">{code_param}</span>
            <div className="flex gap-3">
              <button
                onClick={handleRun}
                disabled={isRunning || isSubmitting}
                className="px-5 py-2 bg-[#3c3c3c] hover:bg-[#4c4c4c] disabled:opacity-50 text-white font-bold rounded-lg transition-colors text-sm flex items-center gap-2"
              >
                {isRunning ? <span className="animate-spin inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full"></span> : '▶'}
                {isRunning ? 'Running...' : 'RUN CODE'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isRunning || isSubmitting}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors text-sm shadow-[0_0_15px_-3px_rgba(5,150,105,0.5)] flex items-center gap-2"
              >
                {isSubmitting ? <span className="animate-spin inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full"></span> : '⚡'}
                {isSubmitting ? 'Submitting...' : 'SUBMIT'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
