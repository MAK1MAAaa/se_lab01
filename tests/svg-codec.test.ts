import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { LocalSvgRepository } from '../src/infrastructure/LocalSvgRepository.js';
import { SvgCodec } from '../src/infrastructure/SvgCodec.js';

const codec = new SvgCodec();
const svg = (body: string, attributes = ''): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${attributes}>${body}</svg>`;

test('all built-in shapes, nested groups and SVG presentation attributes round trip', () => {
  const original = codec.decode(svg(`
    <g id="scene" transform="translate(60,40) scale(0.8)" data-kind="box">
      <rect id="rect" x="1" y="2" width="3" height="4" rx="1" fill="red"/>
      <circle id="circle" cx="5" cy="6" r="7"/>
      <ellipse id="ellipse" cx="8" cy="9" rx="10" ry="11"/>
      <line id="line" x1="1" y1="2" x2="3" y2="4" stroke="black"/>
      <g id="nested"><text id="text" x="10" y="20" font-size="18" text-anchor="middle">中文</text></g>
    </g>
  `, 'width="400px" height="300" viewBox="-10 -20 200 150" style="background:white"'));
  const encoded = codec.encode(original.document);
  const result = codec.decode(encoded);
  assert.equal(result.document.elementCount, 7);
  assert.equal(result.document.width, 400);
  assert.equal(result.document.height, 300);
  assert.equal(result.document.rootAttributes.viewBox, '-10 -20 200 150');
  assert.equal(result.document.rootAttributes.style, 'background:white');
  assert.equal(result.document.requireShape('scene').attributes.transform, 'translate(60,40) scale(0.8)');
  assert.equal(result.document.requireShape('scene').attributes['data-kind'], 'box');
  assert.equal(result.document.requireShape('text').attributes['font-size'], '18');
  assert.equal(result.document.requireShape('text').attributes['text-anchor'], 'middle');
  assert.equal(result.document.requireShape('rect').attributes.rx, '1');
  assert.equal(result.document.requireShape('text').textContent, '中文');
  assert.equal(codec.encode(result.document), encoded);
  assert.deepEqual(result.warnings, []);
});

test('automatic ids reserve every explicit id before assigning names', () => {
  const result = codec.decode(svg(`
    <rect width="10" height="20"/>
    <g><circle id="rect1" r="5"/><rect width="1" height="2"/></g>
  `));
  assert.equal(result.document.children[0]?.id, 'rect2');
  assert.equal(result.document.requireShape('rect3').parent?.id, 'g1');
  assert.deepEqual(result.warnings, [
    'warning: assigned id rect2 to unnamed <rect>',
    'warning: assigned id g1 to unnamed <g>',
    'warning: assigned id rect3 to unnamed <rect>',
  ]);
});

test('XML text and attribute escaping preserve Unicode and special characters', () => {
  const source = svg('<text id="t" x="1" y="2" data-note="&quot;&amp;&lt;&gt;&apos;">中文 &amp; &lt; &gt; " \' <![CDATA[<inside>]]></text>');
  const first = codec.decode(source).document;
  const output = codec.encode(first);
  const second = codec.decode(output).document;
  assert.equal(second.requireShape('t').textContent, '中文 & < > " \' <inside>');
  assert.equal(second.requireShape('t').attributes['data-note'], '"&<>\'');
  assert.match(output, /&amp;/);
  assert.match(output, /&lt;/);
});

test('dimensions default or follow viewBox without discarding its origin', () => {
  const defaults = codec.decode(svg('')).document;
  assert.equal(defaults.width, 800);
  assert.equal(defaults.height, 600);
  const fromViewBox = codec.decode(svg('', 'viewBox="-20, -30, 100, 200"')).document;
  assert.equal(fromViewBox.width, 100);
  assert.equal(fromViewBox.height, 200);
  assert.equal(fromViewBox.rootAttributes.viewBox, '-20, -30, 100, 200');
  assert.throws(() => codec.decode(svg('', 'width="100%"')), /invalid SVG: unsupported width/);
  assert.throws(() => codec.decode(svg('', 'viewBox="0 0 -10 20"')), /invalid SVG: invalid viewBox/);
});

test('malformed XML, wrong namespaces, duplicate ids and unsupported content fail atomically', () => {
  const invalid = [
    svg('<g id="a"><rect id="r" width="1" height="1"></g>'),
    svg('<rect id=r width="1" height="1"/>'),
    svg('<rect id="r" id="other" width="1" height="1"/>'),
    svg('<text id="t">&unknown;</text>'),
    svg('<text id="t">\u0000</text>'),
    svg('<text id="t">&#0;</text>'),
    svg('<text id="t">&#x110000;</text>'),
    svg('<text id="t">&#xD800;</text>'),
    svg('<text id="t">unexpected ]]></text>'),
    '<svg><g id="g"/></svg>',
    '<html xmlns="http://www.w3.org/1999/xhtml"/>',
    svg('<rect xmlns="urn:other" id="r"/>'),
    svg('<g id="a"><circle id="a" r="1"/></g>'),
    svg('<path id="p" d="M0,0"/>'),
    svg('<rect id="r" width="1" height="1"><circle id="c" r="1"/></rect>'),
    svg('<text id="t"><tspan>nested</tspan></text>'),
    svg('<g id="g">unexpected</g>'),
    '<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg"/>',
  ];
  for (const source of invalid) assert.throws(() => codec.decode(source), /^Error: invalid SVG:/);
  assert.deepEqual(codec.decode(svg('<g id="valid"/>')).warnings, []);
});

test('XML declarations, comments and namespace prefixes are accepted', () => {
  const source = '<?xml version="1.0"?>\n<!-- document -->\n'
    + '<s:svg xmlns:s="http://www.w3.org/2000/svg"><!-- child --><s:g id="g"/></s:svg>';
  const result = codec.decode(source);
  assert.equal(result.document.requireShape('g').type, 'g');
  assert.equal(codec.decode(codec.encode(result.document)).document.elementCount, 1);
});

test('repository distinguishes read/parse failures and atomically replaces saved files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'se-lab01-svg-'));
  const repository = new LocalSvgRepository();
  try {
    const target = join(directory, 'drawing.svg');
    await writeFile(target, 'previous content');
    const document = codec.decode(svg('<rect id="r" width="10" height="20"/>')).document;
    await repository.write(target, document);
    assert.equal((await repository.read(target)).document.requireShape('r').type, 'rect');
    assert.match(await readFile(target, 'utf8'), /<svg/);
    assert.deepEqual(await readdir(directory), ['drawing.svg']);

    const missing = join(directory, 'missing.svg');
    await assert.rejects(repository.read(missing), { message: `cannot read file: ${missing}` });
    const malformed = join(directory, 'malformed.svg');
    await writeFile(malformed, '<broken>');
    await assert.rejects(repository.read(malformed), /invalid SVG:/);

    const directoryTarget = join(directory, 'directory.svg');
    await mkdir(directoryTarget);
    await assert.rejects(repository.write(directoryTarget, document), {
      message: `cannot write file: ${directoryTarget}`,
    });
    assert.deepEqual((await readdir(directory)).sort(), ['directory.svg', 'drawing.svg', 'malformed.svg']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
