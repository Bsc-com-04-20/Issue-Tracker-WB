const { spawn } = require('node:child_process');
const path = require('node:path');

const rootDir = process.cwd();
const appDir = path.join(rootDir, 'issue-tracking-system');
const frontendDir = path.join(appDir, 'frontend');
const isWindows = process.platform === 'win32';

function run(command, args, cwd, label) {
  const child = isWindows
    ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', [command, ...args].join(' ')], {
        cwd,
        env: process.env,
        stdio: 'inherit',
      })
    : spawn(command, args, {
        cwd,
        env: process.env,
        stdio: 'inherit',
      });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.stderr.write(`[${label}] stopped by signal ${signal}\n`);
    }
  });

  return child;
}

function waitFor(child) {
  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Process exited with code ${code ?? 'unknown'}`));
    });
  });
}

async function installAll() {
  await waitFor(run('npm', ['install', '--legacy-peer-deps'], appDir, 'backend-install'));
  await waitFor(run('npm', ['install'], frontendDir, 'frontend-install'));
}

function runBackend(extraArgs = []) {
  return run('npm', ['run', 'start:prod', '--', ...extraArgs], appDir, 'backend');
}

function runFrontend(extraArgs = []) {
  return run('npm', ['run', 'dev', '--', ...extraArgs], frontendDir, 'frontend');
}

async function main() {
  const mode = process.argv[2] ?? 'dev';
  const extraArgs = process.argv.slice(3);

  if (mode === 'install') {
    await installAll();
    return;
  }

  if (mode === 'backend') {
    await waitFor(runBackend(extraArgs));
    return;
  }

  if (mode === 'frontend') {
    await waitFor(runFrontend(extraArgs));
    return;
  }

  if (mode === 'dev') {
    const backend = runBackend(extraArgs);
    const frontend = runFrontend(extraArgs);
    const children = [backend, frontend];

    const stopChildren = () => {
      for (const child of children) {
        if (!child.killed) {
          child.kill();
        }
      }
    };

    process.on('SIGINT', stopChildren);
    process.on('SIGTERM', stopChildren);

    const exitHandler = (failedChild, sibling) => failedChild.on('exit', (code) => {
      if (!sibling.killed) {
        sibling.kill();
      }
      process.exit(code ?? 0);
    });

    exitHandler(backend, frontend);
    exitHandler(frontend, backend);
    return;
  }

  throw new Error(`Unknown mode: ${mode}`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
