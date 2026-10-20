import type { SvgDocument } from '../../domain/SvgDocument.js';
import { Arguments } from '../Arguments.js';
import { EditCommand, type EditResult } from '../EditCommand.js';

export class GroupCommand extends EditCommand {
  constructor(private readonly args: readonly string[]) { super(); }

  override apply(document: SvgDocument): EditResult {
    const args = new Arguments(this.args);
    args.count(2, Infinity, 'group <newGid> <id1> <id2>…');
    const group = document.group(args.at(0), args.slice(1));
    return {
      output: `${group.label} created with ${group.children.length} children`,
      undoOutput: `${group.label} grouping undone`,
    };
  }
}
