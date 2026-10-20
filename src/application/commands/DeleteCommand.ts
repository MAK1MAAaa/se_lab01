import type { SvgDocument } from '../../domain/SvgDocument.js';
import { Arguments } from '../Arguments.js';
import { EditCommand, type EditResult } from '../EditCommand.js';

export class DeleteCommand extends EditCommand {
  constructor(private readonly args: readonly string[]) { super(); }

  override apply(document: SvgDocument): EditResult {
    const args = new Arguments(this.args);
    args.count(1, 1, 'delete <id>');
    const shape = document.requireShape(args.at(0));
    const parent = shape.parent?.label ?? 'svg';
    document.delete(shape.id);
    return { output: `${shape.label} deleted`, undoOutput: `${shape.label} restored into ${parent}` };
  }
}
