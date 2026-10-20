import { Arguments } from '../Arguments.js';
import { Command } from '../Command.js';
import type { Editor } from '../Editor.js';

export class SaveCommand extends Command {
  constructor(private readonly args: readonly string[]) { super(); }

  override async execute(editor: Editor): Promise<readonly string[]> {
    const args = new Arguments(this.args);
    args.count(0, 1, 'save [file.svg]');
    return editor.save(args.length > 0 ? args.at(0) : undefined);
  }
}
