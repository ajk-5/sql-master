/** Runs the score server and the Vite dev server together. */
import { spawn } from 'node:child_process';

const children = [
  spawn(process.execPath, ['server/index.ts'], { stdio: 'inherit', shell: false }),
  spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  }),
];

const stop = () => {
  for (const child of children) child.kill();
  process.exit(0);
};

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
for (const child of children) {
  child.on('exit', (code) => {
    if (code) stop();
  });
}
