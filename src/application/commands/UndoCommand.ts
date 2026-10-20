import { Arguments } from '../Arguments.js';
import { Command } from '../Command.js';
import type { Editor } from '../Editor.js';

export class UndoCommand extends Command {
  constructor(private readonly args: readonly string[]) { super(); }

  override async execute(editor: Editor): Promise<readonly string[]> {
    new Arguments(this.args).count(0, 0, 'undo');
    return editor.undo();
  }
}
