import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('Tesseract worker dependencies load with the supported Node runtime', () => {
  const result = spawnSync(process.execPath, [
    '-e',
    "require('tesseract.js/src/worker-script/node/getCore.js')",
  ], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr || result.stdout);
});
