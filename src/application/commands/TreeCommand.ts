import { Arguments } from '../Arguments.js';
import { Command } from '../Command.js';
import type { Editor } from '../Editor.js';
import { TreeFormatter } from '../TreeFormatter.js';

export class TreeCommand extends Command {
  constructor(private readonly args: readonly string[]) { super(); }

  override async execute(editor: Editor): Promise<readonly string[]> {
    const args = new Arguments(this.args);
    args.count(0, 1, 'tree [id]');
    return new TreeFormatter().tree(editor.document, args.length > 0 ? args.at(0) : undefined);
  }
}
