import { ShapeFactory } from '../../domain/ShapeFactory.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import { Arguments } from '../Arguments.js';
import { EditCommand, type EditResult } from '../EditCommand.js';

export class CreateCommand extends EditCommand {
  constructor(private readonly args: readonly string[]) { super(); }

  override apply(document: SvgDocument): EditResult {
    let values = this.args;
    new Arguments(values).count(2, Infinity, 'create <type> <id> [params…] [in <containerId>]');
    let parentId: string | undefined;
    if (values.length >= 4 && values.at(-2) === 'in') {
      parentId = values.at(-1)!;
      values = values.slice(0, -2);
    }
    const args = new Arguments(values);
    const shape = new ShapeFactory().create(args.at(0), args.at(1), args.slice(2));
    document.add(shape, parentId);
    return {
      output: `${shape.label} created${parentId ? ` in g#${parentId}` : ''}`,
      undoOutput: `${shape.label} creation undone`,
    };
  }
}
