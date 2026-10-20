import { Shape } from './Shape.js';

export class Group extends Shape {
  readonly type = 'g';
  private readonly members: Shape[] = [];

  constructor(id: string, extras: Readonly<Record<string, string>> = {}) {
    super(id, {}, [], [], extras);
  }

  override get children(): readonly Shape[] { return Object.freeze([...this.members]); }
  override get isContainer(): boolean { return true; }
  override asContainer(): Group { return this; }

  add(shape: Shape, index = this.members.length): void {
    if (!Number.isInteger(index) || index < 0 || index > this.members.length) throw new Error(`invalid child index: ${index}`);
    for (let ancestor: Shape | null = this; ancestor !== null; ancestor = ancestor.parent) {
      if (ancestor === shape) throw new Error(`cannot move a container into its own descendant: ${shape.id}`);
    }
    const previousParent = shape.parent;
    const previousIndex = previousParent === this ? this.indexOf(shape) : -1;
    if (previousParent !== null) previousParent.remove(shape);
    // Index is interpreted in the original list when reordering an existing child.
    const insertion = previousIndex >= 0 && previousIndex < index ? index - 1 : index;
    this.members.splice(insertion, 0, shape);
    this.setChildParent(shape, this);
  }

  remove(shape: Shape): number {
    const index = this.indexOf(shape);
    if (index < 0) throw new Error(`no such child: ${shape.id}`);
    this.members.splice(index, 1);
    this.setChildParent(shape, null);
    return index;
  }

  indexOf(shape: Shape): number { return this.members.indexOf(shape); }

  clone(): Group {
    const copy = new Group(this.id, this.attributes);
    for (const child of this.members) copy.add(child.clone());
    return copy;
  }

  summary(): string { return this.withStyle(''); }
}
