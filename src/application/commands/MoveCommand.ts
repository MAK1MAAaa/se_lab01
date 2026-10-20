import type { SvgDocument } from '../../domain/SvgDocument.js';
import { Arguments } from '../Arguments.js';
import { EditCommand, type EditResult } from '../EditCommand.js';

export class MoveCommand extends EditCommand {
  constructor(private readonly args: readonly string[]) { super(); }

  override apply(document: SvgDocument): EditResult {
    const args = new Arguments(this.args);
    args.count(3, 3, 'move <id> <dx> <dy>');
    const shape = document.requireShape(args.at(0));
    const dx = args.number(1);
    const dy = args.number(2);
    shape.move(dx, dy);
    return {
      output: `${shape.label} moved by (${dx},${dy})`,
      undoOutput: `${shape.label} moved back by (${-dx},${-dy})`,
    };
  }
}
