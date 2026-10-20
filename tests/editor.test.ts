import assert from 'node:assert/strict';
import test from 'node:test';
import { Editor } from '../src/application/Editor.js';
import type { SvgRepository } from '../src/application/SvgRepository.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';
import { CommandParser } from '../src/presentation/CommandParser.js';
import { CommandRunner } from '../src/presentation/CommandRunner.js';

class FakeRepository implements SvgRepository {
  readonly files = new Map<string, SvgDocument>();
  readonly writes: string[] = [];
  warnings: readonly string[] = [];
  rejectRead = false;
  rejectWrite = false;

  async read(path: string): Promise<{ document: SvgDocument; warnings: readonly string[] }> {
    const document = this.files.get(path);
    if (this.rejectRead || document === undefined) throw new Error(`cannot read file: ${path}`);
    return { document: document.clone(), warnings: this.warnings };
  }

  async write(path: string, document: SvgDocument): Promise<void> {
    if (this.rejectWrite) throw new Error(`cannot write file: ${path}`);
    this.files.set(path, document.clone());
    this.writes.push(path);
  }
}

function fixture(): { editor: Editor; runner: CommandRunner; repository: FakeRepository } {
  const repository = new FakeRepository();
  const editor = new Editor(repository);
  return { editor, runner: new CommandRunner(editor), repository };
}

async function ok(runner: CommandRunner, command: string): Promise<string> {
  const output = (await runner.run(command)).join('\n');
  assert.doesNotMatch(output, /^error:/m, `command failed: ${command}\n${output}`);
  return output;
}

async function error(runner: CommandRunner, command: string, expected: string | RegExp): Promise<void> {
  const output = await runner.run(command);
  assert.equal(output.length, 1, `errors must be returned as one line: ${command}`);
  assert.match(output[0]!, /^error: [^\n\r]*$/);
  if (typeof expected === 'string') assert.equal(output[0], expected);
  else assert.match(output[0]!, expected);
}

async function commands(runner: CommandRunner, lines: readonly string[]): Promise<void> {
  for (const line of lines) await ok(runner, line);
}

test('parser skips empty lines and whole-line comments, preserving color and quoted content', async () => {
  const parser = new CommandParser();
  assert.equal(parser.parse(''), undefined);
  assert.equal(parser.parse('   '), undefined);
  assert.equal(parser.parse('# replay comment'), undefined);
  assert.equal(parser.parse('  # indented comment'), undefined);
  const { runner } = fixture();
  await commands(runner, [
    'init',
    'create rect r 0 0 10 20 #ffffff',
    'create text t 10 20 "hello # world"',
    'create text literal 0 0 "in"',
    'create text sentence 0 0 "hello in world"',
    'create text empty 0 0 ""',
    'create g container',
    'create text nested 1 2 "in" in container',
    'set t text "in"',
  ]);
  assert.match(await ok(runner, 'show r'), /fill=#ffffff/);
  assert.match(await ok(runner, 'show t'), /"in"/);
  assert.match(await ok(runner, 'show literal'), /"in"/);
  assert.match(await ok(runner, 'show sentence'), /"hello in world"/);
  assert.match(await ok(runner, 'show empty'), /""/);
  assert.match(await ok(runner, 'show nested'), /parent=g#container/);
});

test('commands needing a document return the specified error before init/read', async () => {
  const { runner } = fixture();
  for (const command of [
    'create rect r 0 0 10 20', 'delete r', 'move r 1 2', 'scale r 2',
    'set r fill red', 'group g r', 'ungroup g', 'addto g r', 'front r',
    'back r', 'tree', 'show r', 'canvas', 'save missing.svg', 'undo', 'redo',
  ]) {
    await error(runner, command, "error: no document. use 'init' or 'read' first");
  }
  assert.match(await ok(runner, 'help'), /create/);
});

test('all six built-in types are created and shown with geometry and optional styles', async () => {
  const { editor, runner } = fixture();
  await commands(runner, [
    'init 400 300',
    'create rect rect 1.5 -2 30 40 #eee',
    'create circle circle 10 20 3 red',
    'create ellipse ellipse 1 2 3 4 blue',
    'create line line 1 2 30 40 black',
    'create text text 2 4 "中文 title"',
    'create g group',
    'create rect child 0 0 1 1 in group',
  ]);
  assert.equal(editor.document.width, 400);
  assert.equal(editor.document.height, 300);
  assert.equal(editor.document.elementCount, 7);
  assert.match(await ok(runner, 'show rect'), /x=1\.5\s+y=-2/);
  assert.match(await ok(runner, 'show circle'), /cx=10\s+cy=20\s+r=3/);
  assert.match(await ok(runner, 'show ellipse'), /cx=1\s+cy=2\s+rx=3\s+ry=4/);
  assert.match(await ok(runner, 'show line'), /stroke=black/);
  assert.match(await ok(runner, 'show text'), /中文 title/);
  assert.match(await ok(runner, 'show child'), /parent=g#group/);
  assert.doesNotMatch(await ok(runner, 'show child'), /fill=/);
  const subtree = await ok(runner, 'tree group');
  assert.match(subtree, /g#group/);
  assert.match(subtree, /rect#child/);
  assert.doesNotMatch(subtree, /circle#circle/);
});

test('move and scale recursively affect groups, positions, sizes, and both line endpoints', async () => {
  const { runner } = fixture();
  await commands(runner, [
    'init', 'create g scene', 'create g inner in scene',
    'create rect r 1 2 3 4 red in inner',
    'create circle c 5 6 7 in scene',
    'create ellipse e 2 4 6 8 in scene',
    'create line l 1 2 3 4 black in scene',
    'create text t 3 4 "label" in scene',
  ]);
  const before = await ok(runner, 'tree');
  await ok(runner, 'move scene 10 -1');
  assert.match(await ok(runner, 'show r'), /x=11\s+y=1/);
  await ok(runner, 'scale scene 2');
  assert.match(await ok(runner, 'show r'), /x=22\s+y=2\s+(?:w=6\s+h=8|width=6\s+height=8)/);
  assert.match(await ok(runner, 'show c'), /cx=30\s+cy=10\s+r=14/);
  assert.match(await ok(runner, 'show e'), /cx=24\s+cy=6\s+rx=12\s+ry=16/);
  const line = await ok(runner, 'show l');
  assert.match(line, /(?:x1=22\s+y1=2\s+x2=26\s+y2=6|\(22,2\) -> \(26,6\))/);
  assert.match(await ok(runner, 'show t'), /(?:x=26\s+y=6|\(26,6\))/);
  await commands(runner, ['undo', 'undo']);
  assert.equal(await ok(runner, 'tree'), before);
  await commands(runner, ['redo', 'redo']);
  assert.match(await ok(runner, 'show c'), /cx=30\s+cy=10\s+r=14/);
});

test('set supports type geometry, common style, text content, and normal SVG group inheritance', async () => {
  const { runner } = fixture();
  await commands(runner, [
    'init', 'create g g', 'create rect r 0 0 10 20 red in g',
    'create circle c 0 0 2 in g', 'create text t 0 0 "old" in g',
    'set r width 12.5', 'set c r 3', 'set r stroke black', 'set r stroke-width 2',
    'set g fill blue', 'set t text "新 text"',
  ]);
  assert.match(await ok(runner, 'show r'), /(?:w=12\.5|width=12\.5)/);
  assert.match(await ok(runner, 'show r'), /fill=red/);
  assert.match(await ok(runner, 'show r'), /stroke-width=2/);
  assert.match(await ok(runner, 'show g'), /fill=blue/);
  assert.match(await ok(runner, 'show c'), /r=3/);
  await ok(runner, 'undo');
  assert.match(await ok(runner, 'show t'), /"old"/);
  await ok(runner, 'redo');
  assert.match(await ok(runner, 'show t'), /"新 text"/);
  await error(runner, 'set r id renamed', 'error: unknown attribute: id');
  await error(runner, 'set r r 5', 'error: unknown attribute: r');
});

test('group uses document order and undo restores members across their original parents', async () => {
  const { runner } = fixture();
  await commands(runner, [
    'init', 'create g p', 'create g q',
    'create rect a 0 0 1 1 in p', 'create rect spareP 0 0 1 1 in p',
    'create rect b 0 0 1 1 in p', 'create rect c 0 0 1 1 in q',
    'create rect spareQ 0 0 1 1 in q',
  ]);
  const before = await ok(runner, 'tree');
  await ok(runner, 'group collected c b a');
  const group = await ok(runner, 'tree collected');
  assert.ok(group.indexOf('rect#a') < group.indexOf('rect#b'));
  assert.ok(group.indexOf('rect#b') < group.indexOf('rect#c'));
  assert.doesNotMatch(group, /spareP|spareQ/);
  const after = await ok(runner, 'tree');
  await ok(runner, 'undo');
  assert.equal(await ok(runner, 'tree'), before);
  await ok(runner, 'redo');
  assert.equal(await ok(runner, 'tree'), after);
});

test('nested ungroup replaces its slot while a top-level group is rejected', async () => {
  const { runner } = fixture();
  await commands(runner, [
    'init', 'create g outer', 'create rect left 0 0 1 1 in outer',
    'create g inner in outer', 'create rect a 0 0 1 1 in inner',
    'create rect b 0 0 1 1 in inner', 'create rect right 0 0 1 1 in outer',
  ]);
  const before = await ok(runner, 'tree');
  await error(runner, 'ungroup outer', 'error: cannot ungroup top-level container: outer');
  assert.equal(await ok(runner, 'tree'), before);
  await ok(runner, 'ungroup inner');
  const after = await ok(runner, 'tree');
  assert.doesNotMatch(after, /g#inner/);
  for (const [first, second] of [['left', 'a'], ['a', 'b'], ['b', 'right']]) {
    assert.ok(after.indexOf(`rect#${first}`) < after.indexOf(`rect#${second}`));
  }
  assert.match(await ok(runner, 'show a'), /parent=g#outer/);
  await ok(runner, 'undo');
  assert.equal(await ok(runner, 'tree'), before);
  await ok(runner, 'redo');
  assert.equal(await ok(runner, 'tree'), after);
});

test('empty nested group can be dissolved and restored', async () => {
  const { runner } = fixture();
  await commands(runner, ['init', 'create g outer', 'create g empty in outer']);
  const before = await ok(runner, 'tree');
  await ok(runner, 'ungroup empty');
  assert.doesNotMatch(await ok(runner, 'tree'), /g#empty/);
  await ok(runner, 'undo');
  assert.equal(await ok(runner, 'tree'), before);
});

test('addto appends an existing subtree and delete removes/restores all descendants as one unit', async () => {
  const { runner } = fixture();
  await commands(runner, [
    'init', 'create g destination', 'create rect first 0 0 1 1 in destination',
    'create g subtree', 'create circle nested 1 2 3 in subtree',
  ]);
  const before = await ok(runner, 'tree');
  await ok(runner, 'addto destination subtree');
  const moved = await ok(runner, 'tree');
  assert.match(await ok(runner, 'show subtree'), /parent=g#destination/);
  assert.ok(moved.indexOf('rect#first') < moved.indexOf('g#subtree'));
  await ok(runner, 'undo');
  assert.equal(await ok(runner, 'tree'), before);
  await ok(runner, 'redo');
  assert.equal(await ok(runner, 'tree'), moved);
  await ok(runner, 'delete subtree');
  assert.doesNotMatch(await ok(runner, 'tree'), /subtree|nested/);
  await error(runner, 'show nested', 'error: no such shape: nested');
  await ok(runner, 'undo');
  assert.equal(await ok(runner, 'tree'), moved);
  await ok(runner, 'redo');
  assert.doesNotMatch(await ok(runner, 'tree'), /subtree|nested/);
});

test('front/back reorder only siblings, with exact undo and redo', async () => {
  const { runner } = fixture();
  await commands(runner, [
    'init', 'create g g', 'create rect a 0 0 1 1 in g',
    'create rect b 0 0 1 1 in g', 'create rect c 0 0 1 1 in g',
    'create rect other 0 0 1 1',
  ]);
  const before = await ok(runner, 'tree');
  await ok(runner, 'front a');
  const front = await ok(runner, 'tree');
  assert.ok(front.indexOf('rect#c') < front.indexOf('rect#a'));
  await ok(runner, 'back c');
  const back = await ok(runner, 'tree');
  assert.ok(back.indexOf('rect#c') < back.indexOf('rect#b'));
  assert.match(await ok(runner, 'show a'), /parent=g#g/);
  await commands(runner, ['undo', 'undo']);
  assert.equal(await ok(runner, 'tree'), before);
  await commands(runner, ['redo', 'redo']);
  assert.equal(await ok(runner, 'tree'), back);
});

test('specified validation errors preserve the whole tree and do not clear redo', async () => {
  const { runner } = fixture();
  await commands(runner, [
    'init', 'create g g', 'create g nested in g', 'create rect r 1 2 3 4 in nested',
    'move r 5 6', 'undo',
  ]);
  const before = await ok(runner, 'tree');
  for (const [command, expected] of [
    ['create rect r 0 0 1 1', 'error: id already exists: r'],
    ['move missing 1 2', 'error: no such shape: missing'],
    ['create rect new 0 0 1 1 in missing', 'error: no such container: missing'],
    ['create rect new 0 0 1 1 in r', 'error: not a container: r'],
    ['create box box 0 0 1 1 "title"', 'error: unknown shape type: box (is the plugin loaded?)'],
    ['scale g 0', 'error: scale factor must be positive'],
    ['scale g -1', 'error: scale factor must be positive'],
    ['set r transform "translate(1,2)"', 'error: unknown attribute: transform'],
    ['group bad r g', 'error: cannot group a container into its own descendant: g'],
  ]) {
    await error(runner, command!, expected!);
    assert.equal(await ok(runner, 'tree'), before, `failed command mutated document: ${command}`);
  }
  await error(runner, 'addto nested g', /own descendant/);
  assert.equal(await ok(runner, 'tree'), before);
  await ok(runner, 'redo');
  assert.match(await ok(runner, 'show r'), /x=6\s+y=8/);
});

test('invalid numbers, malformed commands, and overflow fail without partial group mutation', async () => {
  const { runner } = fixture();
  await commands(runner, [
    'init', 'create g g', 'create rect first 1 2 3 4 in g',
    'create circle huge 1e308 0 1 in g',
  ]);
  const before = await ok(runner, 'tree');
  for (const command of [
    'move g 1e308 0', 'scale g 1e308', 'move first NaN 0', 'scale g Infinity',
    'create rect invalid 0 0 -1 2', 'set first width -1',
    'create text bad 0 0 "unterminated', 'create rect bad 0 0 1 1 extra extra',
  ]) {
    await error(runner, command, /^error:/);
    assert.equal(await ok(runner, 'tree'), before, `failed command mutated document: ${command}`);
  }
});

test('case-sensitive IDs are distinct and subtree deletion frees all IDs', async () => {
  const { runner } = fixture();
  await commands(runner, [
    'init', 'create g g', 'create rect r 0 0 1 1 in g', 'create rect R 0 0 1 1',
    'delete g', 'create rect r 0 0 2 2',
  ]);
  const tree = await ok(runner, 'tree');
  assert.match(tree, /rect#r/);
  assert.match(tree, /rect#R/);
});

test('display commands and canvas query preserve redo; a successful new edit clears it', async () => {
  const { runner } = fixture();
  await commands(runner, ['init', 'create rect r 0 0 1 1', 'move r 2 3', 'undo']);
  await commands(runner, ['tree', 'tree r', 'show r', 'help', 'canvas', 'redo']);
  assert.match(await ok(runner, 'show r'), /x=2\s+y=3/);
  await commands(runner, ['undo', 'set r fill red']);
  await error(runner, 'redo', 'error: nothing to redo');
});

test('successful init, read, save and resize impose an undo/redo barrier until the next edit', async () => {
  for (const io of ['init 500 400', 'read imported.svg', 'save output.svg', 'canvas 500 400']) {
    const { runner, repository } = fixture();
    repository.files.set('imported.svg', new SvgDocument(300, 200));
    await commands(runner, ['init', 'create rect old 0 0 1 1', io]);
    await error(runner, 'undo', 'error: undo not allowed after io command');
    await error(runner, 'redo', 'error: undo not allowed after io command');
    const baseline = await ok(runner, 'tree');
    await commands(runner, ['create circle fresh 1 2 3', 'undo']);
    assert.equal(await ok(runner, 'tree'), baseline);
    await error(runner, 'undo', 'error: nothing to undo');
    await ok(runner, 'redo');
    assert.match(await ok(runner, 'tree'), /circle#fresh/);
  }
});

test('failed IO and invalid resize preserve document, path and pending redo', async () => {
  const { editor, runner, repository } = fixture();
  await commands(runner, ['init 120 80', 'create rect r 1 2 3 4', 'save original.svg', 'move r 5 6', 'undo']);
  const before = await ok(runner, 'tree');
  repository.rejectWrite = true;
  await error(runner, 'save denied.svg', 'error: cannot write file: denied.svg');
  await error(runner, 'read absent.svg', 'error: cannot read file: absent.svg');
  for (const command of ['canvas 0 20', 'canvas 20 -1', 'canvas 20', 'init -1 20']) {
    await error(runner, command, /^error:/);
  }
  assert.equal(await ok(runner, 'tree'), before);
  assert.equal(editor.currentPath, 'original.svg');
  await ok(runner, 'redo');
  assert.match(await ok(runner, 'show r'), /x=6\s+y=8/);
});

test('read warnings precede success, save reuses current path, and saved state is independent', async () => {
  const { editor, runner, repository } = fixture();
  repository.files.set('external file.svg', new SvgDocument(321, 123));
  repository.warnings = ['warning: assigned id rect1 to unnamed <rect>'];
  const output = await runner.run('read "external file.svg"');
  assert.equal(output[0], repository.warnings[0]);
  assert.match(output[1]!, /^read external file\.svg/);
  assert.equal(editor.currentPath, 'external file.svg');
  await commands(runner, ['create rect r 1 2 3 4', 'save', 'move r 10 20']);
  assert.deepEqual(repository.writes, ['external file.svg']);
  await ok(runner, 'read "external file.svg"');
  assert.match(await ok(runner, 'show r'), /x=1\s+y=2/);
  await ok(runner, 'init');
  assert.equal(editor.currentPath, undefined);
  await error(runner, 'save', /^error: .*file path/);
});

test('create/set reject hexadecimal and binary numbers without discarding redo, while scientific decimal notation works', async () => {
  const { runner } = fixture();
  await commands(runner, ['init', 'create rect r 1 2 3 4', 'move r 5 6', 'undo']);
  const before = await ok(runner, 'tree');
  for (const invalid of ['0x10', '0b11']) {
    for (const command of [
      `create rect invalid ${invalid} 0 1 1`,
      `set r x ${invalid}`,
      `set r width ${invalid}`,
      `set r stroke-width ${invalid}`,
    ]) {
      await error(runner, command, /^error: invalid number/);
      assert.equal(await ok(runner, 'tree'), before, `failed command mutated document: ${command}`);
    }
  }
  await ok(runner, 'redo');
  assert.match(await ok(runner, 'show r'), /x=6\s+y=8/);
  await commands(runner, [
    'create rect scientific 1e2 -2.5E1 .3e+2 4e0',
    'set scientific width 2.5e1',
    'set scientific stroke-width 1e-1',
  ]);
  const scientific = await ok(runner, 'show scientific');
  assert.match(scientific, /x=100\s+y=-25\s+width=25\s+height=4/);
  assert.match(scientific, /stroke-width=0\.1/);
});

test('an edit command instance executes only once and cannot overwrite its undo/redo snapshots', async () => {
  const { MoveCommand } = await import('../src/application/commands/MoveCommand.js');
  const { editor, runner } = fixture();
  await commands(runner, ['init', 'create rect r 10 20 30 40']);
  const before = await ok(runner, 'tree');
  const command = new MoveCommand(['r', '1', '2']);
  await command.execute(editor);
  const after = await ok(runner, 'tree');
  assert.match(await ok(runner, 'show r'), /x=11\s+y=22/);
  await assert.rejects(command.execute(editor), /only execute once/);
  assert.equal(await ok(runner, 'tree'), after);
  await ok(runner, 'undo');
  assert.equal(await ok(runner, 'tree'), before);
  await ok(runner, 'redo');
  assert.equal(await ok(runner, 'tree'), after);
});

test('the imported svg root id is reserved against create and group without changing state', async () => {
  const { editor, runner, repository } = fixture();
  repository.files.set('root.svg', new SvgDocument(400, 300, { id: 'canvas-root' }));
  await commands(runner, ['read root.svg', 'create rect r 1 2 3 4', 'move r 5 6', 'undo']);
  const before = await ok(runner, 'tree');
  for (const command of ['create g canvas-root', 'group canvas-root r']) {
    await error(runner, command, 'error: id already exists: canvas-root');
    assert.equal(await ok(runner, 'tree'), before);
    assert.equal(editor.document.rootAttributes['id'], 'canvas-root');
    assert.equal(editor.currentPath, 'root.svg');
  }
  await ok(runner, 'redo');
  assert.match(await ok(runner, 'show r'), /x=6\s+y=8/);
});

test('saving an imported document to a copy preserves its read path until another successful read', async () => {
  const { editor, runner, repository } = fixture();
  repository.files.set('original.svg', new SvgDocument(400, 300));
  repository.files.set('another.svg', new SvgDocument(200, 100));
  await commands(runner, ['read original.svg', 'save copy.svg', 'save']);
  assert.deepEqual(repository.writes, ['copy.svg', 'original.svg']);
  assert.equal(editor.currentPath, 'original.svg');

  repository.rejectWrite = true;
  await error(runner, 'save denied.svg', 'error: cannot write file: denied.svg');
  assert.equal(editor.currentPath, 'original.svg');
  assert.deepEqual(repository.writes, ['copy.svg', 'original.svg']);
  repository.rejectWrite = false;

  await commands(runner, ['read another.svg', 'save']);
  assert.equal(editor.currentPath, 'another.svg');
  assert.deepEqual(repository.writes, ['copy.svg', 'original.svg', 'another.svg']);
  assert.equal(editor.document.width, 200);
  assert.equal(editor.document.height, 100);
});

test('the first successful save of a new document establishes its default without later copies changing it', async () => {
  const { editor, runner, repository } = fixture();
  await ok(runner, 'init');
  repository.rejectWrite = true;
  await error(runner, 'save denied.svg', 'error: cannot write file: denied.svg');
  assert.equal(editor.currentPath, undefined);
  repository.rejectWrite = false;

  await commands(runner, ['save first.svg', 'save copy.svg', 'save']);
  assert.deepEqual(repository.writes, ['first.svg', 'copy.svg', 'first.svg']);
  assert.equal(editor.currentPath, 'first.svg');
  await ok(runner, 'init');
  assert.equal(editor.currentPath, undefined);
  await error(runner, 'save', /^error: .*file path/);
});
