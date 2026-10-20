import { randomUUID } from 'node:crypto';
import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { SvgRepository } from '../application/SvgRepository.js';
import { SvgDocument } from '../domain/SvgDocument.js';
import { SvgCodec } from './SvgCodec.js';

export class LocalSvgRepository implements SvgRepository {
  constructor(private readonly codec: SvgCodec = new SvgCodec()) {}

  async read(path: string): Promise<{ document: SvgDocument; warnings: readonly string[] }> {
    let source: string;
    try {
      source = await readFile(path, 'utf8');
    } catch (error) {
      throw new Error(`cannot read file: ${path}`, { cause: error });
    }
    return this.codec.decode(source);
  }

  async write(path: string, document: SvgDocument): Promise<void> {
    const temporaryPath = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
    try {
      // Rename only after writing completes, so a failed save leaves the original file intact.
      await writeFile(temporaryPath, this.codec.encode(document), { encoding: 'utf8', flag: 'wx' });
      await rename(temporaryPath, path);
    } catch (error) {
      throw new Error(`cannot write file: ${path}`, { cause: error });
    } finally {
      await unlink(temporaryPath).catch(() => undefined);
    }
  }
}
