import type { Editor } from '../application/Editor.js';
import { CommandParser } from './CommandParser.js';

export class CommandRunner {
  private readonly parser = new CommandParser();

  constructor(private readonly editor: Editor) {}

  async run(line: string): Promise<readonly string[]> {
    try {
      const command = this.parser.parse(line);
      return command ? await command.execute(this.editor) : [];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return [`error: ${message.replace(/[\r\n]+/g, ' ')}`];
    }
  }
}
