import { Shape } from './Shape.js';

export class Circle extends Shape {
  readonly type = 'circle';

  constructor(id: string, cx: number, cy: number, r: number, fill?: string, extras: Readonly<Record<string, string>> = {}) {
    super(id, { cx, cy, r }, ['r'], [['cx', 'cy']], fill === undefined ? extras : { ...extras, fill });
  }

  clone(): Circle { return new Circle(this.id, this.numeric('cx'), this.numeric('cy'), this.numeric('r'), undefined, this.attributes); }

  summary(): string { return this.withStyle(`cx=${this.numeric('cx')} cy=${this.numeric('cy')} r=${this.numeric('r')}`); }
}
