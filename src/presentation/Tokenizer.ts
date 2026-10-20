export class Tokenizer {
  tokenize(line: string): readonly string[] {
    if (line.trimStart().startsWith('#')) return [];
    const tokens: string[] = [];
    let current = '';
    let quoted = false;
    let started = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i]!;
      if (char === '"') {
        quoted = !quoted;
        started = true;
      } else if (char === '\\' && quoted && (line[i + 1] === '"' || line[i + 1] === '\\')) {
        current += line[++i]!;
        started = true;
      } else if (/\s/.test(char) && !quoted) {
        if (started) tokens.push(current);
        current = '';
        started = false;
      } else {
        current += char;
        started = true;
      }
    }
    if (quoted) throw new Error('unterminated quoted string');
    if (started) tokens.push(current);
    return tokens;
  }
}
