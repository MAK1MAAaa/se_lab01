import type { SvgDocument } from '../domain/SvgDocument.js';
import type { EditCommand } from './EditCommand.js';

export class History {
  private undoStack: EditCommand[] = [];
  private redoStack: EditCommand[] = [];
  private blocked = true;

  barrier(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.blocked = true;
  }

  record(command: EditCommand): void {
    this.undoStack.push(command);
    this.redoStack = [];
    this.blocked = false;
  }

  undo(): { document: SvgDocument; output: string } {
    this.checkBarrier();
    const command = this.undoStack.at(-1);
    if (!command) throw new Error('nothing to undo');
    const result = command.undo();
    this.undoStack.pop();
    this.redoStack.push(command);
    return result;
  }

  redo(): { document: SvgDocument; output: string } {
    this.checkBarrier();
    const command = this.redoStack.at(-1);
    if (!command) throw new Error('nothing to redo');
    const result = command.redo();
    this.redoStack.pop();
    this.undoStack.push(command);
    return result;
  }

  private checkBarrier(): void {
    if (this.blocked) throw new Error('undo not allowed after io command');
  }
}
