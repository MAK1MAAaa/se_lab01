import { Arguments } from '../Arguments.js';
import { Command } from '../Command.js';
import type { Editor } from '../Editor.js';
import { TreeFormatter } from '../TreeFormatter.js';

export class ShowCommand extends Command {
  constructor(private readonly args: readonly string[]) { super(); }

  override async execute(editor: Editor): Promise<readonly string[]> {
    const args = new Arguments(this.args);
    args.count(1, 1, 'show <id>');
    return new TreeFormatter().show(editor.document, args.at(0));
  }
}
