import type { SvgDocument } from '../../domain/SvgDocument.js';
import { Arguments } from '../Arguments.js';
import { EditCommand, type EditResult } from '../EditCommand.js';

export class BackCommand extends EditCommand {
  constructor(private readonly args: readonly string[]) { super(); }

  override apply(document: SvgDocument): EditResult {
    const args = new Arguments(this.args);
    args.count(1, 1, 'back <id>');
    const shape = document.requireShape(args.at(0));
    document.sendBack(shape.id);
    return { output: `${shape.label} sent to back`, undoOutput: `${shape.label} z-order restored` };
  }
}
