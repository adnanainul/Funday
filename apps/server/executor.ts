import { exec } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { buildCppRunner } from './cpp-runner';
import { buildJavaRunner } from './java-runner';

export interface ExecutionResult {
  status: 'Accepted' | 'Wrong Answer' | 'Runtime Error' | 'Time Limit Exceeded';
  passed: number;
  total: number;
  results?: Array<{
    input: string;
    expected: string;
    got?: string;
    passed: boolean;
    error?: string;
  }>;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: normalise a value for comparison.
// If both sides are numeric arrays, sort them so order-independent results pass.
// ─────────────────────────────────────────────────────────────────────────────
function normalise(value: unknown): string {
  if (Array.isArray(value) && value.every((v) => typeof v === 'number')) {
    return JSON.stringify([...value].sort((a, b) => a - b));
  }
  return JSON.stringify(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// Build a self-contained JavaScript runner string
// ─────────────────────────────────────────────────────────────────────────────
function buildJsRunner(
  userCode: string,
  functionName: string,
  testCases: Array<{ input: string; expected: string }>,
): string {
  const testCasesJson = JSON.stringify(testCases);

  return `
${userCode}

(function () {
  const testCases = ${testCasesJson};
  const results = [];
  let passed = 0;

  function normalise(value) {
    if (Array.isArray(value) && value.every(v => typeof v === 'number')) {
      return JSON.stringify([...value].sort((a, b) => a - b));
    }
    return JSON.stringify(value);
  }

  for (const tc of testCases) {
    let got;
    let error;
    let testPassed = false;
    try {
      const args = JSON.parse(tc.input);
      got = ${functionName}(...args);
      const expectedNorm = normalise(JSON.parse(tc.expected));
      const gotNorm = normalise(got);
      testPassed = gotNorm === expectedNorm;
      if (testPassed) passed++;
    } catch (e) {
      error = e.message || String(e);
    }
    results.push({
      input: tc.input,
      expected: tc.expected,
      got: got !== undefined ? JSON.stringify(got) : undefined,
      passed: testPassed,
      error,
    });
  }

  const status =
    passed === testCases.length ? 'Accepted' : 'Wrong Answer';

  console.log(JSON.stringify({ passed, total: testCases.length, status, results }));
})();
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build a self-contained Python runner string
// ─────────────────────────────────────────────────────────────────────────────
function buildPyRunner(
  userCode: string,
  functionName: string,
  testCases: Array<{ input: string; expected: string }>,
): string {
  const testCasesJson = JSON.stringify(testCases);

  return `
import json
import sys

${userCode}

def normalise(value):
    if isinstance(value, list) and all(isinstance(v, (int, float)) for v in value):
        return json.dumps(sorted(value))
    return json.dumps(value)

test_cases = json.loads(${JSON.stringify(testCasesJson)})
results = []
passed = 0

for tc in test_cases:
    got = None
    error = None
    test_passed = False
    try:
        args = json.loads(tc['input'])
        got = ${functionName}(*args)
        expected_norm = normalise(json.loads(tc['expected']))
        got_norm = normalise(got)
        test_passed = got_norm == expected_norm
        if test_passed:
            passed += 1
    except Exception as e:
        error = str(e)
    results.append({
        'input': tc['input'],
        'expected': tc['expected'],
        'got': json.dumps(got) if got is not None else None,
        'passed': test_passed,
        'error': error,
    })

status = 'Accepted' if passed == len(test_cases) else 'Wrong Answer'
print(json.dumps({'passed': passed, 'total': len(test_cases), 'status': status, 'results': results}))
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Execute a temp file and return parsed output
// ─────────────────────────────────────────────────────────────────────────────
function runFile(
  filePath: string,
  command: string,
  total: number,
  timeoutMs: number,
): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const child = exec(
      command,
      { timeout: timeoutMs },
      (error, stdout, stderr) => {
        // Always attempt cleanup
        try { fs.unlinkSync(filePath); } catch (_) { /* ignore */ }

        if (error) {
          // Killed by timeout signal
          if ((error as NodeJS.ErrnoException & { killed?: boolean }).killed || error.signal === 'SIGTERM') {
            resolve({
              status: 'Time Limit Exceeded',
              passed: 0,
              total,
              error: 'Execution timed out.',
            });
            return;
          }

          resolve({
            status: 'Runtime Error',
            passed: 0,
            total,
            error: stderr || error.message || 'Unknown runtime error.',
          });
          return;
        }

        try {
          const output = JSON.parse(stdout.trim()) as ExecutionResult;
          resolve(output);
        } catch {
          resolve({
            status: 'Runtime Error',
            passed: 0,
            total,
            error: `Failed to parse runner output: ${stdout.trim() || stderr.trim()}`,
          });
        }
      },
    );

    // Additional safety: kill after timeout (exec timeout flag handles this,
    // but we add a manual kill as a backup).
    const killer = setTimeout(() => {
      try { child.kill('SIGTERM'); } catch (_) { /* ignore */ }
    }, timeoutMs + 500);

    child.on('close', () => clearTimeout(killer));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────
export async function executeCode(
  code: string,
  language: string,
  functionName: string,
  testCases: Array<{ input: string; expected: string }>,
  timeoutMs: number = 5000,
): Promise<ExecutionResult> {
  const total = testCases.length;
  const lang = language.toLowerCase();

  // ── C++ ───────────────────────────────────────────────────────────────────
  if (lang === 'cpp' || lang === 'c++') {
    const runner = buildCppRunner(code, functionName, testCases);
    const tmpDir = os.tmpdir();
    const id = `cb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const tmpFile = path.join(tmpDir, `${id}.cpp`);
    const exeFile = path.join(tmpDir, `${id}.exe`);
    fs.writeFileSync(tmpFile, runner, 'utf8');

    return new Promise((resolve) => {
      exec(`g++ "${tmpFile}" -o "${exeFile}"`, { timeout: 10000 }, (err, stdout, stderr) => {
        if (err) {
          resolve({ status: 'Runtime Error', passed: 0, total, error: 'Compilation Error: ' + (stderr || err.message) });
          try { fs.unlinkSync(tmpFile); } catch(e){}
          return;
        }
        runFile(exeFile, `"${exeFile}"`, total, timeoutMs).then(res => {
          resolve(res);
          try { fs.unlinkSync(tmpFile); fs.unlinkSync(exeFile); } catch(e){}
        });
      });
    });
  }

  // ── Java ──────────────────────────────────────────────────────────────────
  if (lang === 'java') {
    const runner = buildJavaRunner(code, functionName, testCases);
    const tmpDir = os.tmpdir();
    // Java requires the file name to match the public class name (Main)
    const id = `cb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const sessionDir = path.join(tmpDir, id);
    fs.mkdirSync(sessionDir, { recursive: true });
    const tmpFile = path.join(sessionDir, `Main.java`);
    fs.writeFileSync(tmpFile, runner, 'utf8');

    return new Promise((resolve) => {
      exec(`javac "${tmpFile}"`, { timeout: 10000 }, (err, stdout, stderr) => {
        if (err) {
          resolve({ status: 'Runtime Error', passed: 0, total, error: 'Compilation Error: ' + (stderr || err.message) });
          try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch(e){}
          return;
        }
        runFile(sessionDir, `java -cp "${sessionDir}" Main`, total, timeoutMs).then(res => {
          resolve(res);
          try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch(e){}
        });
      });
    });
  }

  // ── JavaScript ────────────────────────────────────────────────────────────
  if (lang === 'javascript' || lang === 'js') {
    const runner = buildJsRunner(code, functionName, testCases);
    const tmpFile = path.join(os.tmpdir(), `cb_runner_${Date.now()}_${Math.random().toString(36).slice(2)}.js`);
    fs.writeFileSync(tmpFile, runner, 'utf8');
    return runFile(tmpFile, `node "${tmpFile}"`, total, timeoutMs);
  }

  // ── Python ────────────────────────────────────────────────────────────────
  if (lang === 'python' || lang === 'py') {
    const runner = buildPyRunner(code, functionName, testCases);
    const tmpFile = path.join(os.tmpdir(), `cb_runner_${Date.now()}_${Math.random().toString(36).slice(2)}.py`);
    fs.writeFileSync(tmpFile, runner, 'utf8');

    // Try `python` first; some systems only have `python3`
    return new Promise((resolve) => {
      runFile(tmpFile, `python "${tmpFile}"`, total, timeoutMs)
        .then((result) => {
          if (
            result.status === 'Runtime Error' &&
            result.error?.includes('not recognized') // windows "python not found"
          ) {
            // Re-create the file (it was deleted) and try python3
            fs.writeFileSync(tmpFile, runner, 'utf8');
            return runFile(tmpFile, `python3 "${tmpFile}"`, total, timeoutMs);
          }
          return result;
        })
        .then(resolve)
        .catch(() =>
          resolve({ status: 'Runtime Error', passed: 0, total, error: 'Python execution failed.' }),
        );
    });
  }

  // ── Unknown language ──────────────────────────────────────────────────────
  return {
    status: 'Runtime Error',
    passed: 0,
    total,
    error: `Unsupported language: ${language}. Supported: javascript, python, cpp, java.`,
  };
}
