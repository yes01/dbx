#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { cp } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const [appPathArg, dmgPathArg] = process.argv.slice(2);

if (!appPathArg || !dmgPathArg) {
  console.error('Usage: node scripts/build-macos-dmg.mjs <App.app> <output.dmg>');
  process.exit(1);
}

const appPath = resolve(appPathArg);
const dmgPath = resolve(dmgPathArg);

if (!appPath.endsWith('.app')) {
  console.error(`App path must end with .app: ${appPath}`);
  process.exit(1);
}

if (!dmgPath.endsWith('.dmg')) {
  console.error(`Output path must end with .dmg: ${dmgPath}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  console.log(`$ ${command} ${args.map((arg) => JSON.stringify(arg)).join(' ')}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const stagingDir = mkdtempSync(join(tmpdir(), 'dbx-dmg-'));

try {
  const stagedAppPath = join(stagingDir, basename(appPath));
  await cp(appPath, stagedAppPath, {
    recursive: true,
    preserveTimestamps: true,
    verbatimSymlinks: true,
  });
  symlinkSync('/Applications', join(stagingDir, 'Applications'));

  run('mkdir', ['-p', dirname(dmgPath)]);
  run('rm', ['-f', dmgPath]);
  run('codesign', ['--verify', '--deep', '--strict', '--verbose=4', stagedAppPath]);
  run('hdiutil', [
    'create',
    '-volname',
    basename(appPath, '.app'),
    '-srcfolder',
    stagingDir,
    '-ov',
    '-format',
    'UDZO',
    '-fs',
    'HFS+',
    dmgPath,
  ]);
  run('hdiutil', ['verify', dmgPath]);
} finally {
  rmSync(stagingDir, { recursive: true, force: true });
}
