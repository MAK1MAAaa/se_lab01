import type { SvgDocument } from '../../domain/SvgDocument.js';
import { Arguments } from '../Arguments.js';
import { EditCommand, type EditResult } from '../EditCommand.js';

export class ScaleCommand extends EditCommand {
  constructor(private readonly args: readonly string[]) { super(); }

  override apply(document: SvgDocument): EditResult {
    const args = new Arguments(this.args);
    args.count(2, 2, 'scale <id> <factor>');
    const shape = document.requireShape(args.at(0));
    const factor = args.number(1);
    shape.scale(factor);
    return { output: `${shape.label} scaled by ${factor}`, undoOutput: `${shape.label} scale restored` };
  }
}
