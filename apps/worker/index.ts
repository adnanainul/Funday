import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

async function runCode(language, code, testCases) {
  // Very naive local execution engine for MVP without docker
  const tmpFile = path.join(__dirname, 'temp.' + (language === 'python' ? 'py' : 'js'));
  await fs.writeFile(tmpFile, code);
  
  // TODO: Loop through test cases and execute
  
  return new Promise((resolve) => {
    const cmd = language === 'python' ? `python ${tmpFile}` : `node ${tmpFile}`;
    
    exec(cmd, { timeout: 3000 }, (error, stdout, stderr) => {
      // delete temp file
      fs.unlink(tmpFile).catch(console.error);
      
      if (error) {
         if (error.killed) {
           return resolve({ status: 'Time Limit Exceeded' });
         }
         return resolve({ status: 'Runtime Error', output: stderr });
      }
      resolve({ status: 'Accepted', output: stdout });
    });
  });
}

console.log("Worker waiting for jobs...");
// To be connected with Redis/BullMQ or simply HTTP calls for MVP
