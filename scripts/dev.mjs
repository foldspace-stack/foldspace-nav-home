import { spawn } from 'node:child_process';

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function run(command, args, label) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (code && code !== 0) {
      process.exitCode = code;
    } else if (signal) {
      process.exitCode = 1;
    }
  });

  child.on('error', (error) => {
    console.error(`[${label}] failed to start:`, error);
    process.exit(1);
  });

  return child;
}

async function buildOnce() {
  await new Promise((resolve, reject) => {
    const child = run(pnpm, ['exec', 'vite', 'build'], 'build');
    child.on('exit', (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`Initial build failed with exit code ${code ?? 'unknown'}`));
    });
  });
}

async function main() {
  await buildOnce();

  const watcher = run(pnpm, ['exec', 'vite', 'build', '--watch'], 'watch');
  const worker = run(pnpm, ['exec', 'wrangler', 'dev', '--port', '56435'], 'worker');

  const shutdown = () => {
    watcher.kill('SIGINT');
    worker.kill('SIGINT');
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  const stopOnExit = (code, signal) => {
    shutdown();
    if (signal) {
      process.exitCode = 1;
      return;
    }
    if (typeof code === 'number' && code !== 0) {
      process.exitCode = code;
    }
  };

  watcher.on('exit', stopOnExit);
  worker.on('exit', stopOnExit);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
