import type { SvgDocument } from '../domain/SvgDocument.js';
import { Command } from './Command.js';
import type { Editor } from './Editor.js';

export interface EditResult {
  readonly output: string;
  readonly undoOutput: string;
}

export abstract class EditCommand extends Command {
  private before: SvgDocument | undefined;
  private after: SvgDocument | undefined;
  private result: EditResult | undefined;

  abstract apply(document: SvgDocument): EditResult;

  override async execute(editor: Editor): Promise<readonly string[]> {
    return editor.executeEdit(this);
  }

  capture(before: SvgDocument, after: SvgDocument, result: EditResult): void {
    if (this.before || this.after) throw new Error('edit command can only execute once; use redo');
    this.before = before.clone();
    this.after = after.clone();
    this.result = result;
  }

  undo(): { document: SvgDocument; output: string } {
    if (!this.before || !this.result) throw new Error('command has not executed');
    return { document: this.before.clone(), output: this.result.undoOutput };
  }

  redo(): { document: SvgDocument; output: string } {
    if (!this.after || !this.result) throw new Error('command has not executed');
    return { document: this.after.clone(), output: this.result.output };
  }
}
