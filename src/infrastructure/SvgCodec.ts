import {
  DOMImplementation,
  DOMParser,
  XMLSerializer,
  type Document as XmlDocument,
  type Element as XmlElement,
} from '@xmldom/xmldom';
import { Shape } from '../domain/Shape.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import { SvgDocument } from '../domain/SvgDocument.js';

/** Converts the supported SVG subset without discarding imported presentation attributes. */
export class SvgCodec {
  private static readonly namespace = 'http://www.w3.org/2000/svg';
  private static readonly numberPattern = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?';

  constructor(private readonly factory: ShapeFactory = new ShapeFactory()) {}

  decode(source: string): { document: SvgDocument; warnings: readonly string[] } {
    try {
      this.validateXmlSource(source);
      // Throw even on warnings: otherwise xmldom can repair malformed XML silently.
      const xml = new DOMParser({
        onError: (_level, message) => { throw new Error(message); },
      }).parseFromString(source, 'application/xml');
      if (xml.doctype !== null) {
        throw new Error('DOCTYPE is not supported');
      }
      const root = xml.documentElement;
      if (root === null || root.localName !== 'svg' || root.namespaceURI !== SvgCodec.namespace) {
        throw new Error('expected an <svg> root in the SVG namespace');
      }

      const usedIds = new Set<string>();
      this.collectExplicitIds(root, usedIds);
      const viewBox = this.readViewBox(root.getAttribute('viewBox'));
      const width = this.readLength(root.getAttribute('width'), viewBox?.[2] ?? 800, 'width');
      const height = this.readLength(root.getAttribute('height'), viewBox?.[3] ?? 600, 'height');
      const attributes = this.readAttributes(root);
      delete attributes.width;
      delete attributes.height;
      delete attributes.xmlns;
      const document = new SvgDocument(width, height, attributes);
      const warnings: string[] = [];
      const counters = new Map<string, number>();

      for (const child of this.elementChildren(root)) {
        document.add(this.readShape(child, usedIds, counters, warnings));
      }
      this.rejectNonWhitespaceText(root);
      return { document, warnings };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`invalid SVG: ${reason}`, { cause: error });
    }
  }

  encode(document: SvgDocument): string {
    const xml = new DOMImplementation().createDocument(SvgCodec.namespace, 'svg', null);
    const root = xml.documentElement;
    if (root === null) throw new Error('cannot create SVG document');
    root.setAttribute('xmlns', SvgCodec.namespace);
    this.writeAttributes(root, document.rootAttributes);
    root.setAttribute('width', String(document.width));
    root.setAttribute('height', String(document.height));
    if (!root.hasAttribute('viewBox')) {
      root.setAttribute('viewBox', `0 0 ${document.width} ${document.height}`);
    }
    for (const shape of document.children) {
      root.appendChild(this.writeShape(xml, shape));
    }
    return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(xml)}\n`;
  }

  private collectExplicitIds(element: XmlElement, usedIds: Set<string>): void {
    if (element.namespaceURI !== SvgCodec.namespace) {
      throw new Error(`unsupported namespace on <${element.tagName}>`);
    }
    const id = element.getAttribute('id');
    if (id !== null) {
      if (id.trim() === '') throw new Error('id must not be empty');
      if (usedIds.has(id)) throw new Error(`duplicate id: ${id}`);
      usedIds.add(id);
    }
    for (const child of this.elementChildren(element)) {
      this.collectExplicitIds(child, usedIds);
    }
  }

  private validateXmlSource(source: string): void {
    // xmldom accepts invalid XML characters and numeric references; close those parser gaps.
    for (const character of source) {
      if (!this.isXmlCharacter(character.codePointAt(0) ?? -1)) {
        throw new Error('invalid XML character');
      }
    }
    const parsedContent = source.replace(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>/g, '');
    if (parsedContent.includes(']]>')) throw new Error('unexpected CDATA terminator');
    for (const match of parsedContent.matchAll(/&#(?:x([\da-fA-F]+)|(\d+));/g)) {
      const value = match[1] === undefined ? Number(match[2]) : Number.parseInt(match[1], 16);
      if (!this.isXmlCharacter(value)) throw new Error(`invalid XML character reference: ${match[0]}`);
    }
  }

  private isXmlCharacter(value: number): boolean {
    return value === 0x09 || value === 0x0a || value === 0x0d
      || (value >= 0x20 && value <= 0xd7ff)
      || (value >= 0xe000 && value <= 0xfffd)
      || (value >= 0x10000 && value <= 0x10ffff);
  }

  private readShape(
    element: XmlElement,
    usedIds: Set<string>,
    counters: Map<string, number>,
    warnings: string[],
  ): Shape {
    const type = element.localName ?? element.tagName;
    let id = element.getAttribute('id');
    if (id === null) {
      let sequence = counters.get(type) ?? 0;
      do {
        sequence += 1;
        id = `${type}${sequence}`;
      } while (usedIds.has(id));
      counters.set(type, sequence);
      usedIds.add(id);
      warnings.push(`warning: assigned id ${id} to unnamed <${type}>`);
    }
    const attributes = this.readAttributes(element);
    delete attributes.id;
    const shape = this.factory.fromAttributes(type, id, attributes, element.textContent ?? undefined);
    const children = this.elementChildren(element);
    if (shape.isContainer) {
      this.rejectNonWhitespaceText(element);
      for (const child of children) {
        shape.asContainer().add(this.readShape(child, usedIds, counters, warnings));
      }
    } else {
      if (children.length > 0) throw new Error(`<${type}> cannot contain child elements`);
      if (shape.textContent === undefined) this.rejectNonWhitespaceText(element);
    }
    return shape;
  }

  private readAttributes(element: XmlElement): Record<string, string> {
    const attributes: Record<string, string> = Object.create(null) as Record<string, string>;
    for (let index = 0; index < element.attributes.length; index += 1) {
      const attribute = element.attributes.item(index);
      if (attribute !== null) attributes[attribute.name] = attribute.value;
    }
    return attributes;
  }

  private elementChildren(element: XmlElement): XmlElement[] {
    const elements: XmlElement[] = [];
    for (let child = element.firstChild; child !== null; child = child.nextSibling) {
      if (child.nodeType === 1) elements.push(child as XmlElement);
    }
    return elements;
  }

  private rejectNonWhitespaceText(element: XmlElement): void {
    for (let child = element.firstChild; child !== null; child = child.nextSibling) {
      if ((child.nodeType === 3 || child.nodeType === 4) && child.nodeValue?.trim()) {
        throw new Error(`unexpected text in <${element.localName}>`);
      }
    }
  }

  private readLength(value: string | null, fallback: number, name: string): number {
    if (value === null) return fallback;
    if (!new RegExp(`^${SvgCodec.numberPattern}(?:px)?$`).test(value.trim())) {
      throw new Error(`unsupported ${name}: ${value}`);
    }
    const length = Number(value.trim().replace(/px$/, ''));
    if (!Number.isFinite(length) || length <= 0) throw new Error(`${name} must be positive`);
    return length;
  }

  private readViewBox(value: string | null): readonly [number, number, number, number] | undefined {
    if (value === null) return undefined;
    const number = SvgCodec.numberPattern;
    const separator = '(?:\\s+|\\s*,\\s*)';
    if (!new RegExp(`^${number}${separator}${number}${separator}${number}${separator}${number}$`).test(value.trim())) {
      throw new Error(`invalid viewBox: ${value}`);
    }
    const parts = value.trim().split(/[\s,]+/).map(Number);
    const [x, y, width, height] = parts;
    if (x === undefined || y === undefined || width === undefined || height === undefined
      || !parts.every(Number.isFinite) || width <= 0 || height <= 0) {
      throw new Error(`invalid viewBox: ${value}`);
    }
    return [x, y, width, height];
  }

  private writeShape(xml: XmlDocument, shape: Shape): XmlElement {
    const element = xml.createElementNS(SvgCodec.namespace, shape.type);
    element.setAttribute('id', shape.id);
    this.writeAttributes(element, shape.attributes);
    if (shape.textContent !== undefined) {
      element.appendChild(xml.createTextNode(shape.textContent));
    }
    for (const child of shape.children) {
      element.appendChild(this.writeShape(xml, child));
    }
    return element;
  }

  private writeAttributes(element: XmlElement, attributes: Readonly<Record<string, string>>): void {
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  }
}
