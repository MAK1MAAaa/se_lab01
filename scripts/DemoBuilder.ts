import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Editor } from '../src/application/Editor.js';
import { TreeFormatter } from '../src/application/TreeFormatter.js';
import { LocalSvgRepository } from '../src/infrastructure/LocalSvgRepository.js';
import { SvgCodec } from '../src/infrastructure/SvgCodec.js';
import { CommandRunner } from '../src/presentation/CommandRunner.js';

interface DemoStep {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly commands: readonly string[];
}

interface DemoFrame {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly command: string;
  readonly output: readonly string[];
  readonly svg: string;
  readonly tree: readonly string[];
}

/** Builds replay evidence through the same parser, commands and history as the CLI. */
export class DemoBuilder {
  private readonly repository = new LocalSvgRepository();
  private readonly editor = new Editor(this.repository);
  private readonly runner = new CommandRunner(this.editor);
  private readonly codec = new SvgCodec();
  private readonly formatter = new TreeFormatter();
  private readonly outputDirectory = join('opendesign', 'mockups', 'cli-showcase');

  private readonly steps: readonly DemoStep[] = [
    {
      id: 'create', title: '创建流程图',
      description: '读取字体与画布模板，用内置的 g、rect、text、line 逐项创建两个节点和连接线。',
      commands: [
        'read examples/flowchart-template.svg',
        'create g flowchart',
        'create g node1 in flowchart',
        'create rect start 104 140 240 100 #edf3fc in node1',
        'set start stroke #4a90d9',
        'set start stroke-width 2',
        'create text start-label 224 198 "开始" in node1',
        'set start-label fill #244a83',
        'create g node2 in flowchart',
        'create rect process 616 140 240 100 #fff4de in node2',
        'set process stroke #f5a623',
        'set process stroke-width 2',
        'create text process-label 736 198 "处理数据" in node2',
        'set process-label fill #79530c',
        'create line arrow1 344 190 616 190 #414751 in flowchart',
        'set arrow1 stroke-width 2',
        'create line arrow-top 604 183 616 190 #414751 in flowchart',
        'set arrow-top stroke-width 2',
        'create line arrow-bottom 604 197 616 190 #414751 in flowchart',
        'set arrow-bottom stroke-width 2',
      ],
    },
    {
      id: 'move', title: '整体移动',
      description: '节点 2 下移 92 px，矩形与文字一起移动。连接线是独立图形，按任务语义保持原位。',
      commands: ['move node2 0 92', 'show process', 'show process-label'],
    },
    {
      id: 'undo-move', title: '撤销移动',
      description: '一次 undo 恢复整个节点，矩形回到 y=140，文字回到 y=198。',
      commands: ['undo', 'show process', 'show process-label'],
    },
    {
      id: 'redo-move', title: '重做移动',
      description: 'redo 恢复移动后的快照，矩形回到 y=232，文字回到 y=290。',
      commands: ['redo', 'show process', 'show process-label'],
    },
    {
      id: 'restore', title: '恢复对齐',
      description: '再次撤销，让两个节点重新对齐。显示命令不会进入撤销栈。',
      commands: ['undo', 'show process'],
    },
    {
      id: 'edit-text', title: '修改文字',
      description: '通过 id 精确修改节点中的文字，完成一次新的可撤销编辑。',
      commands: ['set process-label text "处理数据 v2"', 'show process-label'],
    },
    {
      id: 'undo-text', title: '撤销文字',
      description: '恢复修改前的文本内容，图形和层级保持原有状态。',
      commands: ['undo', 'show process-label'],
    },
    {
      id: 'redo-text', title: '重做文字',
      description: '恢复“处理数据 v2”，准备保存当前文档。',
      commands: ['redo', 'show process-label'],
    },
    {
      id: 'save', title: '保存 SVG',
      description: '保存为标准 SVG，并按任务要求设置撤销屏障。产物可以直接下载或在浏览器中打开。',
      commands: ['save examples/flowchart-polished.svg'],
    },
  ];

  async build(): Promise<void> {
    await mkdir(join(this.outputDirectory, 'assets'), { recursive: true });
    const frames: DemoFrame[] = [];
    for (const [index, step] of this.steps.entries()) {
      const output: string[] = [];
      for (const command of step.commands) {
        const result = await this.runner.run(command);
        if (result.some(line => line.startsWith('error:'))) {
          throw new Error(`demo command failed: ${command}\n${result.join('\n')}`);
        }
        output.push(...result);
      }
      const svg = `assets/${String(index + 1).padStart(2, '0')}-${step.id}.svg`;
      // Evidence snapshots bypass the save command, preserving its real undo/redo barrier semantics.
      await writeFile(join(this.outputDirectory, svg), this.codec.encode(this.editor.document), 'utf8');
      frames.push({
        id: step.id, title: step.title, description: step.description,
        command: step.commands.join('\n'), output, svg,
        tree: this.formatter.tree(this.editor.document),
      });
    }
    const saved = (await this.repository.read('examples/flowchart-polished.svg')).document;
    assert.equal(saved.elementCount, 10);
    assert.equal(saved.requireShape('process').attributes.y, '140');
    assert.equal(saved.requireShape('process-label').textContent, '处理数据 v2');
    assert.deepEqual(await this.runner.run('undo'), ['error: undo not allowed after io command']);
    await writeFile(join(this.outputDirectory, 'timeline.json'), `${JSON.stringify({
      title: 'SVG 编辑器 · CLI 命令回放', canvas: { width: 960, height: 420 }, frames,
    }, null, 2)}\n`, 'utf8');
    await writeFile('examples/flowchart-polished.commands', [
      '# 在项目根执行：npm run cli -- --script examples/flowchart-polished.commands',
      '# 仅使用 Phase 1 的六种图形与既定命令；字体设置来自可读回的 SVG 模板。',
      ...this.steps.flatMap(step => [`# ${step.title}`, ...step.commands]), '',
    ].join('\n'), 'utf8');
    console.log(`Built ${frames.length} real command replay frames; saved SVG has ${saved.elementCount} elements.`);
  }
}

await new DemoBuilder().build();
