import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Group } from './Group.js';
import { Line } from './Line.js';
import { Rect } from './Rect.js';
import type { Shape } from './Shape.js';
import { TextShape } from './TextShape.js';

type ShapeBuilder = {
  readonly min: number;
  readonly max: number;
  readonly create: (id: string, params: readonly string[]) => Shape;
  readonly read: (id: string, attributes: Readonly<Record<string, string>>, text: string | undefined) => Shape;
};

/** Phase 1's single shape-name dispatch boundary; providers can replace it later. */
export class ShapeFactory {
  private readonly builders: ReadonlyMap<string, ShapeBuilder> = new Map<string, ShapeBuilder>([
    ['rect', {
      min: 4, max: 5,
      create: (id, p) => new Rect(id, this.number(p[0], 'x'), this.number(p[1], 'y'), this.number(p[2], 'width'), this.number(p[3], 'height'), p[4]),
      read: (id, a) => new Rect(id, this.attribute(a, 'x'), this.attribute(a, 'y'), this.attribute(a, 'width'), this.attribute(a, 'height'), undefined, a),
    }],
    ['circle', {
      min: 3, max: 4,
      create: (id, p) => new Circle(id, this.number(p[0], 'cx'), this.number(p[1], 'cy'), this.number(p[2], 'r'), p[3]),
      read: (id, a) => new Circle(id, this.attribute(a, 'cx'), this.attribute(a, 'cy'), this.attribute(a, 'r'), undefined, a),
    }],
    ['ellipse', {
      min: 4, max: 5,
      create: (id, p) => new Ellipse(id, this.number(p[0], 'cx'), this.number(p[1], 'cy'), this.number(p[2], 'rx'), this.number(p[3], 'ry'), p[4]),
      read: (id, a) => new Ellipse(id, this.attribute(a, 'cx'), this.attribute(a, 'cy'), this.attribute(a, 'rx'), this.attribute(a, 'ry'), undefined, a),
    }],
    ['line', {
      min: 4, max: 5,
      create: (id, p) => new Line(id, this.number(p[0], 'x1'), this.number(p[1], 'y1'), this.number(p[2], 'x2'), this.number(p[3], 'y2'), p[4]),
      read: (id, a) => new Line(id, this.attribute(a, 'x1'), this.attribute(a, 'y1'), this.attribute(a, 'x2'), this.attribute(a, 'y2'), undefined, a),
    }],
    ['text', {
      min: 3, max: 3,
      create: (id, p) => new TextShape(id, this.number(p[0], 'x'), this.number(p[1], 'y'), p[2] ?? ''),
      read: (id, a, text) => new TextShape(id, this.attribute(a, 'x'), this.attribute(a, 'y'), text ?? '', a),
    }],
    ['g', {
      min: 0, max: 0,
      create: (id) => new Group(id),
      read: (id, a) => new Group(id, a),
    }],
  ]);

  create(type: string, id: string, params: readonly string[]): Shape {
    const builder = this.requireBuilder(type);
    if (params.length < builder.min || params.length > builder.max) throw new Error(`invalid parameters for ${type}`);
    return builder.create(id, params);
  }

  fromAttributes(type: string, id: string, attributes: Readonly<Record<string, string>>, text?: string): Shape {
    return this.requireBuilder(type).read(id, attributes, text);
  }

  private requireBuilder(type: string): ShapeBuilder {
    const builder = this.builders.get(type);
    if (builder === undefined) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return builder;
  }

  private attribute(attributes: Readonly<Record<string, string>>, name: string): number {
    return this.number(attributes[name] ?? '0', name);
  }

  private number(value: string | undefined, name: string): number {
    if (value === undefined || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)
      || !Number.isFinite(Number(value))) {
      throw new Error(`invalid number for ${name}: ${String(value)}`);
    }
    return Number(value);
  }
}
