import { Shape } from './Shape.js';

export class Line extends Shape {
  readonly type = 'line';

  constructor(id: string, x1: number, y1: number, x2: number, y2: number, stroke?: string, extras: Readonly<Record<string, string>> = {}) {
    super(id, { x1, y1, x2, y2 }, [], [['x1', 'y1'], ['x2', 'y2']], stroke === undefined ? extras : { ...extras, stroke });
  }

  clone(): Line { return new Line(this.id, this.numeric('x1'), this.numeric('y1'), this.numeric('x2'), this.numeric('y2'), undefined, this.attributes); }

  summary(): string { return this.withStyle(`(${this.numeric('x1')},${this.numeric('y1')}) -> (${this.numeric('x2')},${this.numeric('y2')})`); }
}
