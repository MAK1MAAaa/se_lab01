import { Group } from './Group.js';
import type { Shape } from './Shape.js';

export class SvgDocument {
  private canvasWidth: number;
  private canvasHeight: number;
  private readonly roots: Shape[] = [];
  private readonly svgAttributes: Readonly<Record<string, string>>;

  constructor(width = 800, height = 600, rootAttributes: Readonly<Record<string, string>> = {}) {
    this.validateDimension('width', width);
    this.validateDimension('height', height);
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.svgAttributes = Object.freeze({ ...rootAttributes });
  }

  get width(): number { return this.canvasWidth; }
  get height(): number { return this.canvasHeight; }
  get children(): readonly Shape[] { return Object.freeze([...this.roots]); }
  get rootAttributes(): Readonly<Record<string, string>> { return this.svgAttributes; }
  get elementCount(): number { return this.preorder().length; }

  requireShape(id: string): Shape {
    const shape = this.find(id);
    if (shape === undefined) throw new Error(`no such shape: ${id}`);
    return shape;
  }

  requireContainer(id: string): Group {
    const shape = this.find(id);
    if (shape === undefined) throw new Error(`no such container: ${id}`);
    return shape.asContainer();
  }

  add(shape: Shape, parentId?: string, index?: number): void {
    const parent = parentId === undefined ? undefined : this.requireContainer(parentId);
    const destinationLength = parent === undefined ? this.roots.length : parent.children.length;
    this.validateIndex(index ?? destinationLength, destinationLength);
    const existing = new Set(this.preorder().map((element) => element.id));
    if (this.rootAttributes.id !== undefined) existing.add(this.rootAttributes.id);
    for (const element of this.preorder([shape])) {
      if (existing.has(element.id)) throw new Error(`id already exists: ${element.id}`);
      existing.add(element.id);
    }
    // A subtree may only enter a document at its root; moving existing nodes uses addTo.
    if (shape.parent !== null) throw new Error(`shape already has a parent: ${shape.id}`);
    if (parent === undefined) this.roots.splice(index ?? this.roots.length, 0, shape);
    else parent.add(shape, index);
  }

  delete(id: string): Shape {
    const shape = this.requireShape(id);
    this.detach(shape);
    return shape;
  }

  group(newId: string, ids: readonly string[]): Group {
    if (this.find(newId) !== undefined || this.rootAttributes.id === newId) {
      throw new Error(`id already exists: ${newId}`);
    }
    if (ids.length === 0) throw new Error('group requires at least one shape');
    const selected = new Set<Shape>();
    for (const id of ids) {
      const shape = this.requireShape(id);
      if (selected.has(shape)) throw new Error(`duplicate shape id: ${id}`);
      selected.add(shape);
    }
    for (const shape of selected) {
      for (let ancestor = shape.parent; ancestor !== null; ancestor = ancestor.parent) {
        if (selected.has(ancestor)) throw new Error(`cannot group a container into its own descendant: ${ancestor.id}`);
      }
    }
    const ordered = this.preorder().filter((shape) => selected.has(shape));
    const group = new Group(newId);
    // Cross-parent groups are created at the canvas root; DFS preserves visual order.
    for (const shape of ordered) {
      this.detach(shape);
      group.add(shape);
    }
    this.roots.push(group);
    return group;
  }

  ungroup(id: string): void {
    const group = this.requireContainer(id);
    const parent = group.parent;
    if (parent === null) throw new Error(`cannot ungroup top-level container: ${id}`);
    const index = parent.indexOf(group);
    const children = [...group.children];
    parent.remove(group);
    children.forEach((child, offset) => parent.add(child, index + offset));
  }

  addTo(groupId: string, id: string): void {
    const destination = this.requireContainer(groupId);
    const shape = this.requireShape(id);
    for (let ancestor: Shape | null = destination; ancestor !== null; ancestor = ancestor.parent) {
      if (ancestor === shape) throw new Error(`cannot move a container into its own descendant: ${id}`);
    }
    this.detach(shape);
    destination.add(shape);
  }

  bringFront(id: string): void {
    const shape = this.requireShape(id);
    const parent = shape.parent;
    this.detach(shape);
    if (parent === null) this.roots.push(shape);
    else parent.add(shape);
  }

  sendBack(id: string): void {
    const shape = this.requireShape(id);
    const parent = shape.parent;
    this.detach(shape);
    if (parent === null) this.roots.unshift(shape);
    else parent.add(shape, 0);
  }

  resize(width: number, height: number): void {
    this.validateDimension('width', width);
    this.validateDimension('height', height);
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  clone(): SvgDocument {
    const copy = new SvgDocument(this.width, this.height, this.rootAttributes);
    for (const shape of this.roots) copy.add(shape.clone());
    return copy;
  }

  private find(id: string): Shape | undefined { return this.preorder().find((shape) => shape.id === id); }

  private preorder(roots: readonly Shape[] = this.roots): Shape[] {
    const elements: Shape[] = [];
    const visit = (shape: Shape): void => {
      elements.push(shape);
      for (const child of shape.children) visit(child);
    };
    for (const root of roots) visit(root);
    return elements;
  }

  private detach(shape: Shape): void {
    if (shape.parent !== null) shape.parent.remove(shape);
    else this.roots.splice(this.roots.indexOf(shape), 1);
  }

  private validateDimension(name: string, value: number): void {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`canvas ${name} must be finite and positive`);
  }

  private validateIndex(index: number, length: number): void {
    if (!Number.isInteger(index) || index < 0 || index > length) throw new Error(`invalid child index: ${index}`);
  }
}
