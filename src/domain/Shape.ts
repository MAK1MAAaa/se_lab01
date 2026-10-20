import type { Group } from './Group.js';

/** Common, encapsulated SVG behavior shared by leaves and composite groups. */
export abstract class Shape {
  abstract readonly type: string;

  private readonly shapeId: string;
  private owner: Group | null = null;
  private readonly values: Record<string, string>;
  private readonly geometryNames: readonly string[];
  private readonly nonNegativeNames: ReadonlySet<string>;
  private readonly positions: readonly (readonly [string, string])[];

  protected constructor(
    id: string,
    geometry: Readonly<Record<string, number>>,
    nonNegativeNames: readonly string[],
    positions: readonly (readonly [string, string])[],
    extras: Readonly<Record<string, string>> = {},
  ) {
    if (id.trim().length === 0) throw new Error('id must not be empty');
    this.shapeId = id;
    this.values = Object.assign(Object.create(null) as Record<string, string>, extras);
    delete this.values.id;
    this.geometryNames = Object.keys(geometry);
    this.nonNegativeNames = new Set(nonNegativeNames);
    this.positions = positions;
    for (const [name, value] of Object.entries(geometry)) {
      this.values[name] = this.format(this.validateNumber(name, value));
    }
    if (this.values['stroke-width'] !== undefined) {
      this.values['stroke-width'] = this.format(this.parseNumber('stroke-width', this.values['stroke-width']));
    }
  }

  get id(): string { return this.shapeId; }
  get label(): string { return `${this.type}#${this.id}`; }
  get parent(): Group | null { return this.owner; }
  get children(): readonly Shape[] { return Object.freeze([]); }
  get attributes(): Readonly<Record<string, string>> { return Object.freeze({ ...this.values }); }
  get textContent(): string | undefined { return undefined; }
  get isContainer(): boolean { return false; }

  asContainer(): Group { throw new Error(`not a container: ${this.id}`); }

  move(dx: number, dy: number): void {
    this.requireFinite('dx', dx);
    this.requireFinite('dy', dy);
    this.transform((shape) => {
      const changes: Record<string, number> = {};
      for (const [x, y] of shape.positions) {
        changes[x] = shape.numeric(x) + dx;
        changes[y] = shape.numeric(y) + dy;
      }
      return changes;
    });
  }

  scale(factor: number): void {
    if (!Number.isFinite(factor) || factor <= 0) throw new Error('scale factor must be positive');
    this.transform((shape) => Object.fromEntries(
      shape.geometryNames.map((name) => [name, shape.numeric(name) * factor]),
    ));
  }

  setAttribute(name: string, value: string): void {
    if (this.geometryNames.includes(name) || name === 'stroke-width') {
      this.values[name] = this.format(this.parseNumber(name, value));
      return;
    }
    if (name === 'fill' || name === 'stroke') {
      this.values[name] = value;
      return;
    }
    throw new Error(`unknown attribute: ${name}`);
  }

  abstract clone(): Shape;
  abstract summary(): string;

  protected numeric(name: string): number { return Number(this.values[name]); }

  protected styleSummary(): string {
    return ['fill', 'stroke', 'stroke-width']
      .filter((name) => this.values[name] !== undefined)
      .map((name) => `${name}=${this.values[name]}`)
      .join(' ');
  }

  protected withStyle(geometry: string): string {
    return [geometry, this.styleSummary()].filter((part) => part.length > 0).join(' ');
  }

  /** Only the composite implementation may establish or remove parent links. */
  protected setChildParent(child: Shape, parent: Group | null): void { child.owner = parent; }

  private parseNumber(name: string, value: string): number {
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) {
      throw new Error(`invalid number for ${name}: ${value}`);
    }
    return this.validateNumber(name, Number(value));
  }

  private validateNumber(name: string, value: number): number {
    this.requireFinite(name, value);
    if ((this.nonNegativeNames.has(name) || name === 'stroke-width') && value < 0) {
      throw new Error(`${name} must be non-negative`);
    }
    return value;
  }

  private requireFinite(name: string, value: number): void {
    if (!Number.isFinite(value)) throw new Error(`invalid number for ${name}: ${value}`);
  }

  private format(value: number): string { return String(Object.is(value, -0) ? 0 : value); }

  private transform(calculate: (shape: Shape) => Readonly<Record<string, number>>): void {
    const updates: Array<readonly [Shape, Readonly<Record<string, number>>]> = [];
    const visit = (shape: Shape): void => {
      const changes = calculate(shape);
      for (const [name, value] of Object.entries(changes)) shape.validateNumber(name, value);
      updates.push([shape, changes]);
      for (const child of shape.children) visit(child);
    };
    // Validate the entire subtree before writing anything, including overflow cases.
    visit(this);
    for (const [shape, changes] of updates) {
      for (const [name, value] of Object.entries(changes)) shape.values[name] = shape.format(value);
    }
  }
}
