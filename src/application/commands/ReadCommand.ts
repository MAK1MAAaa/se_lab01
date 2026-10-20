import { Arguments } from '../Arguments.js';
import { Command } from '../Command.js';
import type { Editor } from '../Editor.js';

export class ReadCommand extends Command {
  constructor(private readonly args: readonly string[]) { super(); }

  override async execute(editor: Editor): Promise<readonly string[]> {
    const args = new Arguments(this.args);
    args.count(1, 1, 'read <file.svg>');
    return editor.read(args.at(0));
  }
}
