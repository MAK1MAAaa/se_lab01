import { Shape } from './Shape.js';

export class TextShape extends Shape {
  readonly type = 'text';
  private content: string;

  constructor(id: string, x: number, y: number, content: string, extras: Readonly<Record<string, string>> = {}) {
    super(id, { x, y }, [], [['x', 'y']], extras);
    this.content = content;
  }

  override get textContent(): string { return this.content; }

  override setAttribute(name: string, value: string): void {
    if (name === 'text') this.content = value;
    else super.setAttribute(name, value);
  }

  clone(): TextShape { return new TextShape(this.id, this.numeric('x'), this.numeric('y'), this.content, this.attributes); }

  summary(): string { return this.withStyle(`(${this.numeric('x')},${this.numeric('y')}) ${JSON.stringify(this.content)}`); }
}
