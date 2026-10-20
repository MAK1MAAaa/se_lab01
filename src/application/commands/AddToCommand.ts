import type { SvgDocument } from '../../domain/SvgDocument.js';
import { Arguments } from '../Arguments.js';
import { EditCommand, type EditResult } from '../EditCommand.js';

export class AddToCommand extends EditCommand {
  constructor(private readonly args: readonly string[]) { super(); }

  override apply(document: SvgDocument): EditResult {
    const args = new Arguments(this.args);
    args.count(2, 2, 'addto <gid> <id>');
    const shape = document.requireShape(args.at(1));
    const oldParent = shape.parent?.label ?? 'svg';
    document.addTo(args.at(0), shape.id);
    return {
      output: `${shape.label} added to g#${args.at(0)}`,
      undoOutput: `${shape.label} restored into ${oldParent}`,
    };
  }
}
