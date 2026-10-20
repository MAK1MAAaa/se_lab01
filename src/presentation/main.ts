import { Editor } from '../application/Editor.js';
import { LocalSvgRepository } from '../infrastructure/LocalSvgRepository.js';
import { Cli } from './Cli.js';
import { CommandRunner } from './CommandRunner.js';

const editor = new Editor(new LocalSvgRepository());
await new Cli(new CommandRunner(editor)).start(process.argv.slice(2));
