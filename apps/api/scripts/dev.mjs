import { spawn } from 'node:child_process';

const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const children = new Set();

function run(args, options = {}) {
  const child = spawn(command, args, { stdio: 'inherit', ...options });
  children.add(child);
  child.once('exit', () => children.delete(child));
  return child;
}

function waitFor(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Command exited with ${signal ?? code}`));
    });
  });
}

function stop(signal = 'SIGTERM') {
  for (const child of children) child.kill(signal);
}

process.once('SIGINT', () => { stop('SIGINT'); process.exitCode = 130; });
process.once('SIGTERM', () => { stop(); process.exitCode = 143; });
process.once('exit', () => stop());

try {
  await waitFor(run(['exec', 'tsc', '-p', 'tsconfig.build.json']));
  const compiler = run(['exec', 'tsc', '-p', 'tsconfig.build.json', '--watch', '--preserveWatchOutput']);
  const api = run(['exec', 'node', '--watch', '--enable-source-maps', 'dist/main.js']);

  const result = await Promise.race([
    waitFor(compiler).then(() => 0),
    waitFor(api).then(() => 0),
  ]);
  stop();
  process.exitCode = result;
} catch (error) {
  stop();
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
