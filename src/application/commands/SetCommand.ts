import type { SvgDocument } from '../../domain/SvgDocument.js';
import { Arguments } from '../Arguments.js';
import { EditCommand, type EditResult } from '../EditCommand.js';

export class SetCommand extends EditCommand {
  constructor(private readonly args: readonly string[]) { super(); }

  override apply(document: SvgDocument): EditResult {
    const args = new Arguments(this.args);
    args.count(3, 3, 'set <id> <attr> <value>');
    const shape = document.requireShape(args.at(0));
    const attr = args.at(1);
    const value = args.at(2);
    const previous = attr === 'text' ? shape.textContent : shape.attributes[attr];
    shape.setAttribute(attr, value);
    return {
      output: `${shape.label} updated: ${attr}=${JSON.stringify(value)}`,
      undoOutput: `${shape.label} updated: ${attr}=${previous === undefined ? '(unset)' : JSON.stringify(previous)}`,
    };
  }
}
