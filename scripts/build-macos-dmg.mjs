#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
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
  // Preserve macOS bundle metadata so the copied app remains codesign-verifiable.
  run('ditto', [appPath, stagedAppPath]);
  symlinkSync('/Applications', join(stagingDir, 'Applications'));

  run('mkdir', ['-p', dirname(dmgPath)]);
  run('rm', ['-f', dmgPath]);
  // codesign verification: check if the app is properly signed.
  // CI builds (--ci / --no-sign) produce ad-hoc signed bundles that may
  // have broken signatures. A broken signature causes macOS Gatekeeper to
  // show "app is damaged" with NO option to open, which is worse than
  // having no signature at all.
  const csResult = spawnSync('codesign', ['--verify', '--deep', '--strict', '--verbose=4', stagedAppPath], {
    stdio: 'inherit',
  });
  if (csResult.status !== 0) {
    console.warn('⚠ codesign verification failed — re-signing with ad-hoc signature for CI builds.');
    // Remove quarantine extended attributes that block opening downloaded apps.
    spawnSync('xattr', ['-cr', stagedAppPath], { stdio: 'inherit' });
    // Re-sign with a valid ad-hoc signature so macOS treats the app as
    // "unsigned" (with an "Open Anyway" option) instead of "damaged" (no bypass).
    run('codesign', ['--force', '--deep', '-s', '-', stagedAppPath]);
  }
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
