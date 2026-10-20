import { Arguments } from '../Arguments.js';
import { Command } from '../Command.js';
import type { Editor } from '../Editor.js';

export class HelpCommand extends Command {
  constructor(private readonly args: readonly string[]) { super(); }

  override async execute(_editor: Editor): Promise<readonly string[]> {
    new Arguments(this.args).count(0, 0, 'help');
    return [
      'init [w] [h]                          new canvas (default 800x600)',
      'read <file.svg>                        load SVG',
      'save [file.svg]                        save SVG',
      'canvas [w] [h]                         show or resize canvas',
      'create <type> <id> [params…] [in <gid>] create a shape',
      '  rect <id> <x> <y> <w> <h> [fill]',
      '  circle <id> <cx> <cy> <r> [fill]',
      '  ellipse <id> <cx> <cy> <rx> <ry> [fill]',
      '  line <id> <x1> <y1> <x2> <y2> [stroke]',
      '  text <id> <x> <y> "content"',
      '  g <id>',
      'delete <id>                            delete shape and descendants',
      'move <id> <dx> <dy>                     translate coordinates',
      'scale <id> <factor>                     scale coordinates and dimensions',
      'set <id> <attr> <value>                 set allowed attribute',
      'group <newGid> <id1> <id2>…              group existing shapes',
      'ungroup <gid>                          dissolve a nested group',
      'addto <gid> <id>                        reparent to group',
      'front <id> / back <id>                  change sibling z-order',
      'tree [id] / show <id>                   display structure or attributes',
      'undo / redo                            undo or redo one edit',
      'help                                   show commands',
      'Lines beginning with # are comments. Double-quote values containing spaces.',
      'End input with Ctrl-D. Only rect/circle/ellipse/line/text/g are built in.',
    ];
  }
}
