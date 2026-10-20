import type { Shape } from '../domain/Shape.js';
import type { SvgDocument } from '../domain/SvgDocument.js';

export class TreeFormatter {
  tree(document: SvgDocument, id?: string): readonly string[] {
    if (id !== undefined) {
      const shape = document.requireShape(id);
      return [this.line(shape), ...this.branches(shape.children, '')];
    }
    return [`svg (${document.width}x${document.height})`, ...this.branches(document.children, '')];
  }

  show(document: SvgDocument, id: string): readonly string[] {
    const shape = document.requireShape(id);
    const styles = new Set(['fill', 'stroke', 'stroke-width']);
    const attributes = Object.entries(shape.attributes);
    const geometry = attributes.filter(([key]) => !styles.has(key)).map(([key, value]) => `${key}=${value}`);
    const presentation = attributes.filter(([key]) => styles.has(key)).map(([key, value]) => `${key}=${value}`);
    const lines = [geometry.join(' '), presentation.join(' ')].filter(Boolean);
    if (shape.textContent !== undefined) lines.push(`text=${JSON.stringify(shape.textContent)}`);
    return [`${shape.label}  parent=${shape.parent?.label ?? 'svg'}`, ...lines.map(value => `  ${value}`)];
  }

  private line(shape: Shape): string {
    const summary = shape.summary();
    return summary ? `${shape.label}  ${summary}` : shape.label;
  }

  private branches(children: readonly Shape[], prefix: string): string[] {
    return children.flatMap((shape, index) => {
      const last = index === children.length - 1;
      return [
        `${prefix}${last ? '└── ' : '├── '}${this.line(shape)}`,
        ...this.branches(shape.children, `${prefix}${last ? '    ' : '│   '}`),
      ];
    });
  }
}
