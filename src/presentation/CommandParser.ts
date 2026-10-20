import type { Command } from '../application/Command.js';
import { AddToCommand } from '../application/commands/AddToCommand.js';
import { BackCommand } from '../application/commands/BackCommand.js';
import { CanvasCommand } from '../application/commands/CanvasCommand.js';
import { CreateCommand } from '../application/commands/CreateCommand.js';
import { DeleteCommand } from '../application/commands/DeleteCommand.js';
import { FrontCommand } from '../application/commands/FrontCommand.js';
import { GroupCommand } from '../application/commands/GroupCommand.js';
import { HelpCommand } from '../application/commands/HelpCommand.js';
import { InitCommand } from '../application/commands/InitCommand.js';
import { MoveCommand } from '../application/commands/MoveCommand.js';
import { ReadCommand } from '../application/commands/ReadCommand.js';
import { RedoCommand } from '../application/commands/RedoCommand.js';
import { SaveCommand } from '../application/commands/SaveCommand.js';
import { ScaleCommand } from '../application/commands/ScaleCommand.js';
import { SetCommand } from '../application/commands/SetCommand.js';
import { ShowCommand } from '../application/commands/ShowCommand.js';
import { TreeCommand } from '../application/commands/TreeCommand.js';
import { UndoCommand } from '../application/commands/UndoCommand.js';
import { UngroupCommand } from '../application/commands/UngroupCommand.js';
import { Tokenizer } from './Tokenizer.js';

type CommandConstructor = new (args: readonly string[]) => Command;

export class CommandParser {
  // Phase 2: move this built-in registry behind a provider registration API.
  private readonly commands = new Map<string, CommandConstructor>([
    ['init', InitCommand], ['read', ReadCommand], ['save', SaveCommand], ['canvas', CanvasCommand],
    ['create', CreateCommand], ['delete', DeleteCommand], ['move', MoveCommand], ['scale', ScaleCommand],
    ['set', SetCommand], ['group', GroupCommand], ['ungroup', UngroupCommand], ['addto', AddToCommand],
    ['front', FrontCommand], ['back', BackCommand], ['tree', TreeCommand], ['show', ShowCommand],
    ['help', HelpCommand], ['undo', UndoCommand], ['redo', RedoCommand],
  ]);
  private readonly tokenizer = new Tokenizer();

  parse(line: string): Command | undefined {
    const [name, ...args] = this.tokenizer.tokenize(line);
    if (name === undefined) return undefined;
    const CommandType = this.commands.get(name);
    if (!CommandType) throw new Error(`unknown command: ${name}`);
    return new CommandType(args);
  }
}
