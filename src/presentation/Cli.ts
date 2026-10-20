import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { stdin, stdout } from 'node:process';
import type { CommandRunner } from './CommandRunner.js';

export class Cli {
  constructor(private readonly runner: CommandRunner) {}

  async start(args: readonly string[]): Promise<void> {
    if (args.length === 1 && args[0] === '--help') {
      stdout.write('Usage: npm run cli [-- --script <file> | -- --help]\n');
      await this.execute('help');
      return;
    }
    if (args.length === 2 && args[0] === '--script') {
      let source: string;
      try {
        source = await readFile(args[1]!, 'utf8');
      } catch {
        stdout.write(`error: cannot read script: ${args[1]!.replace(/[\r\n]+/g, ' ')}\n`);
        process.exitCode = 1;
        return;
      }
      for (const line of source.split(/\r?\n/)) {
        if (!await this.execute(line)) process.exitCode = 1;
      }
      return;
    }
    if (args.length !== 0) {
      stdout.write('error: usage: npm run cli [-- --script <file> | -- --help]\n');
      process.exitCode = 1;
      return;
    }
    stdout.write("svg-editor 0.1 — type 'help' for commands\n\n");
    const input = createInterface({ input: stdin, crlfDelay: Infinity, terminal: false });
    stdout.write('svg> ');
    for await (const line of input) {
      await this.execute(line);
      stdout.write('svg> ');
    }
    stdout.write('\n');
  }

  private async execute(line: string): Promise<boolean> {
    const output = await this.runner.run(line);
    if (output.length > 0) stdout.write(`${output.join('\n')}\n`);
    return !output.some(value => value.startsWith('error:'));
  }
}
