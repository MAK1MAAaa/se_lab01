import { Shape } from './Shape.js';

export class Rect extends Shape {
  readonly type = 'rect';

  constructor(id: string, x: number, y: number, width: number, height: number, fill?: string, extras: Readonly<Record<string, string>> = {}) {
    super(id, { x, y, width, height }, ['width', 'height'], [['x', 'y']], fill === undefined ? extras : { ...extras, fill });
  }

  clone(): Rect { return new Rect(this.id, this.numeric('x'), this.numeric('y'), this.numeric('width'), this.numeric('height'), undefined, this.attributes); }

  summary(): string {
    return this.withStyle(`x=${this.numeric('x')} y=${this.numeric('y')} w=${this.numeric('width')} h=${this.numeric('height')}`);
  }
}
