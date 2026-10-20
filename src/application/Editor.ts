import { SvgDocument } from '../domain/SvgDocument.js';
import type { EditCommand } from './EditCommand.js';
import { History } from './History.js';
import type { SvgRepository } from './SvgRepository.js';

export class Editor {
  private current: SvgDocument | undefined;
  private filePath: string | undefined;
  private readonly history = new History();

  constructor(private readonly repository: SvgRepository) {}

  get document(): SvgDocument {
    if (!this.current) throw new Error("no document. use 'init' or 'read' first");
    return this.current;
  }

  get currentPath(): string | undefined { return this.filePath; }

  init(width = 800, height = 600): readonly string[] {
    const document = new SvgDocument(width, height);
    this.current = document;
    this.filePath = undefined;
    this.history.barrier();
    return [`canvas ${width}x${height} created`];
  }

  async read(path: string): Promise<readonly string[]> {
    const result = await this.repository.read(path);
    this.current = result.document;
    this.filePath = path;
    this.history.barrier();
    return [...result.warnings, `read ${path} (${result.document.elementCount} elements)`];
  }

  async save(path?: string): Promise<readonly string[]> {
    const document = this.document;
    const destination = path ?? this.filePath;
    if (!destination) throw new Error('no file path. use save <file.svg>');
    await this.repository.write(destination, document);
    // Saving a copy must preserve the path established by read or the first save.
    this.filePath ??= destination;
    this.history.barrier();
    return [`saved to ${destination} (${document.elementCount} elements)`];
  }

  canvas(width?: number, height?: number): readonly string[] {
    const document = this.document;
    if (width === undefined && height === undefined) return [`canvas ${document.width}x${document.height}`];
    if (width === undefined || height === undefined) throw new Error('usage: canvas [w] [h]');
    const working = document.clone();
    working.resize(width, height);
    this.current = working;
    this.history.barrier();
    return [`canvas resized to ${width}x${height}`];
  }

  executeEdit(command: EditCommand): readonly string[] {
    const before = this.document;
    const working = before.clone();
    const result = command.apply(working);
    command.capture(before, working, result);
    this.current = working;
    this.history.record(command);
    return [result.output];
  }

  undo(): readonly string[] {
    void this.document;
    const result = this.history.undo();
    this.current = result.document;
    return [result.output];
  }

  redo(): readonly string[] {
    void this.document;
    const result = this.history.redo();
    this.current = result.document;
    return [result.output];
  }
}
