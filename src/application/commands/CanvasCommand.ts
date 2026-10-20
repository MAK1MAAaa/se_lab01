import { Arguments } from '../Arguments.js';
import { Command } from '../Command.js';
import type { Editor } from '../Editor.js';

export class CanvasCommand extends Command {
  constructor(private readonly args: readonly string[]) { super(); }

  override async execute(editor: Editor): Promise<readonly string[]> {
    const args = new Arguments(this.args);
    if (args.length === 0) return editor.canvas();
    args.count(2, 2, 'canvas [w] [h]');
    return editor.canvas(args.number(0), args.number(1));
  }
}
