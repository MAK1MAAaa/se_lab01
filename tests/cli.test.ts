import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));

function cli(args: readonly string[] = [], input = ''): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, ['--import', 'tsx', 'src/presentation/main.ts', ...args], {
    cwd: projectRoot,
    input,
    encoding: 'utf8',
    timeout: 15_000,
  });
}

test('stdin REPL prints the banner and prompt, replays comments, and exits cleanly at EOF', () => {
  const result = cli([], [
    '# replay a diagram', '', 'init 400 300',
    'create g node', 'create rect r 10 20 30 40 #4a90d9 in node',
    'create text label 15 35 "开始 in node" in node',
    'move node 5 10', 'undo', 'redo', 'tree', '',
  ].join('\n'));
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, String(result.stderr));
  const output = String(result.stdout);
  assert.match(output, /svg-editor 0\.1/);
  assert.match(output, /svg>/);
  assert.match(output, /svg \(400x300\)/);
  assert.match(output, /rect#r.*x=15 y=30/);
  assert.match(output, /开始 in node/);
  assert.doesNotMatch(output, /^error:/m);
  assert.equal(String(result.stderr), '');
});

test('REPL reports an error in one line and continues to later commands', () => {
  const result = cli([], 'init\nmove missing 1 2\ncreate circle c 1 2 3\ntree\n');
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, String(result.stderr));
  const output = String(result.stdout);
  assert.match(output, /error: no such shape: missing/);
  assert.match(output, /circle#c.*cx=1 cy=2 r=3/);
});

test('--script accepts a path with spaces and saves a directly readable SVG', () => {
  const directory = mkdtempSync(join(tmpdir(), 'se-lab01-cli-'));
  try {
    const script = join(directory, 'diagram commands.txt');
    const outputPath = join(directory, 'flow chart.svg');
    writeFileSync(script, [
      '# script mode', 'init 200 100', 'create g flow',
      'create rect r 10 20 40 30 #ffffff in flow',
      'create text t 15 40 "A & B" in flow',
      `save "${outputPath}"`, 'tree', '',
    ].join('\n'));
    const result = cli(['--script', script]);
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, String(result.stderr));
    assert.match(String(result.stdout), /saved to/);
    assert.match(String(result.stdout), /g#flow/);
    const svg = readFileSync(outputPath, 'utf8');
    assert.match(svg, /<svg\b/);
    assert.match(svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg, /A &amp; B/);
    const read = cli([], `read "${outputPath}"\nshow t\n`);
    assert.equal(read.status, 0, String(read.stderr));
    assert.match(String(read.stdout), /A & B/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('--help prints executable usage and command syntax without waiting for input', () => {
  const result = cli(['--help']);
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, String(result.stderr));
  const output = String(result.stdout);
  for (const command of ['init', 'create', 'group', 'ungroup', 'undo', 'redo', 'save']) {
    assert.match(output, new RegExp(`\\b${command}\\b`));
  }
  assert.match(output, /--script/);
});
