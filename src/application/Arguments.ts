export class Arguments {
  constructor(private readonly values: readonly string[]) {}

  count(min: number, max = min, usage = ''): void {
    if (this.values.length < min || this.values.length > max) {
      throw new Error(`usage: ${usage}`);
    }
  }

  at(index: number): string {
    const value = this.values[index];
    if (value === undefined) throw new Error('missing argument');
    return value;
  }

  number(index: number): number {
    const raw = this.at(index);
    // Number('') and hexadecimal forms are not coordinate syntax.
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw)) {
      throw new Error(`invalid number: ${raw}`);
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`invalid number: ${raw}`);
    return value;
  }

  get length(): number { return this.values.length; }
  slice(start: number, end?: number): readonly string[] { return this.values.slice(start, end); }
}
