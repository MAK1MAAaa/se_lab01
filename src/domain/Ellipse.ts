import { Shape } from './Shape.js';

export class Ellipse extends Shape {
  readonly type = 'ellipse';

  constructor(id: string, cx: number, cy: number, rx: number, ry: number, fill?: string, extras: Readonly<Record<string, string>> = {}) {
    super(id, { cx, cy, rx, ry }, ['rx', 'ry'], [['cx', 'cy']], fill === undefined ? extras : { ...extras, fill });
  }

  clone(): Ellipse { return new Ellipse(this.id, this.numeric('cx'), this.numeric('cy'), this.numeric('rx'), this.numeric('ry'), undefined, this.attributes); }

  summary(): string { return this.withStyle(`cx=${this.numeric('cx')} cy=${this.numeric('cy')} rx=${this.numeric('rx')} ry=${this.numeric('ry')}`); }
}
