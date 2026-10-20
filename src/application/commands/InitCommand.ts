import { Arguments } from '../Arguments.js';
import { Command } from '../Command.js';
import type { Editor } from '../Editor.js';

export class InitCommand extends Command {
  constructor(private readonly args: readonly string[]) { super(); }

  override async execute(editor: Editor): Promise<readonly string[]> {
    const args = new Arguments(this.args);
    args.count(0, 2, 'init [w] [h]');
    return editor.init(args.length > 0 ? args.number(0) : 800, args.length > 1 ? args.number(1) : 600);
  }
}
