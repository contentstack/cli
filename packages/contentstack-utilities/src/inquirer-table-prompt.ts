/**
 * Table prompt for inquirer v12.
 * Standalone implementation (no inquirer/lib) compatible with
 * inquirer 12 legacy adapter: constructor(question, rl, answers) + run() returns Promise.
 */

import * as readline from 'readline';
import chalk from 'chalk';
import figures from 'figures';
import cliCursor from 'cli-cursor';
import Table from 'cli-table';

interface ChoiceLike {
  name?: string;
  value?: string;
}

interface TableQuestion {
  message?: string;
  name?: string;
  columns?: ChoiceLike[];
  rows?: ChoiceLike[];
  selectAll?: boolean;
  pageSize?: number;
}

type ReadLine = readline.Interface & { input: NodeJS.ReadableStream; output: NodeJS.WritableStream };

function pluckName(c: ChoiceLike): string {
  return c.name ?? String(c.value ?? '');
}

function getValue(c: ChoiceLike): string {
  return c.value ?? c.name ?? '';
}

class TablePrompt {
  private question: TableQuestion;
  private rl: ReadLine;
  private selectAll: boolean;
  private columns: ChoiceLike[];
  private rows: ChoiceLike[];
  private pointer: number;
  private horizontalPointer: number;
  private values: (string | undefined)[];
  private pageSize: number;
  private spaceKeyPressed: boolean;
  private status: 'idle' | 'answered';
  private done: ((value: (string | undefined)[]) => void) | null;
  private lastHeight: number;

  constructor(question: TableQuestion, rl: ReadLine, _answers: Record<string, unknown>) {
    this.question = question;
    this.rl = rl;
    this.selectAll = Boolean(question.selectAll);
    this.columns = Array.isArray(question.columns) ? question.columns : [];
    this.rows = this.selectAll
      ? [{ name: 'Select All', value: 'selectAll' }, ...(question.rows || [])]
      : Array.isArray(question.rows) ? question.rows : [];
    this.pointer = 0;
    this.horizontalPointer = 0;
    this.values = this.columns.map(() => undefined);
    this.pageSize = Number(question.pageSize) || 5;
    this.spaceKeyPressed = false;
    this.status = 'idle';
    this.done = null;
    this.lastHeight = 0;
  }

  run(): Promise<(string | undefined)[]> {
    return new Promise((resolve) => {
      this.done = (value) => {
        this.status = 'answered';
        cliCursor.show();
        resolve(value);
      };

      const onKeypress = (_str: string, key: { name: string; ctrl?: boolean }) => {
        if (this.status === 'answered') return;
        if (key.ctrl && key.name === 'c') return;

        switch (key.name) {
          case 'up':
            this.onUpKey();
            break;
          case 'down':
            this.onDownKey();
            break;
          case 'left':
            this.onLeftKey();
            break;
          case 'right':
            this.onRightKey();
            break;
          case 'space':
            this.onSpaceKey();
            break;
          case 'enter':
          case 'return':
            this.onSubmit();
            break;
          default:
            return;
        }
        this.render();
      };

      (this.rl.input as NodeJS.EventEmitter).on('keypress', onKeypress);

      cliCursor.hide();
      this.render();
    });
  }

  private getCurrentValue(): (string | undefined)[] {
    const out: (string | undefined)[] = [];
    for (let i = 0; i < this.rows.length; i++) {
      out.push(this.values[i]);
    }
    return out;
  }

  private onSubmit(): void {
    if (!this.done) return;
    const raw = this.getCurrentValue();
    if (this.selectAll && raw.length > 0) {
      this.done(raw.slice(1));
    } else {
      this.done(raw);
    }
  }

  private onUpKey(): void {
    this.pointer = this.pointer > 0 ? this.pointer - 1 : this.pointer;
  }

  private onDownKey(): void {
    const len = this.rows.length;
    this.pointer = this.pointer < len - 1 ? this.pointer + 1 : this.pointer;
  }

  private onLeftKey(): void {
    const len = this.columns.length;
    this.horizontalPointer = this.horizontalPointer > 0 ? this.horizontalPointer - 1 : len - 1;
  }

  private onRightKey(): void {
    const len = this.columns.length;
    this.horizontalPointer = this.horizontalPointer < len - 1 ? this.horizontalPointer + 1 : 0;
  }

  private selectAllValues(value: string): void {
    this.values = this.rows.map(() => value);
  }

  private onSpaceKey(): void {
    const col = this.columns[this.horizontalPointer];
    const row = this.rows[this.pointer];
    if (!col) return;
    const value = getValue(col);
    const rowValue = row ? getValue(row) : '';
    if (rowValue === 'selectAll') {
      this.selectAllValues(value);
    } else {
      this.values[this.pointer] = value;
    }
    this.spaceKeyPressed = true;
  }

  private paginate(): [number, number] {
    const mid = Math.floor(this.pageSize / 2);
    const len = this.rows.length;
    let first = Math.max(0, this.pointer - mid);
    let last = Math.min(first + this.pageSize - 1, len - 1);
    const offset = this.pageSize - 1 - (last - first);
    first = Math.max(0, first - offset);
    return [first, last];
  }

  private getMessage(): string {
    let msg = this.question.message || 'Select';
    if (!this.spaceKeyPressed) {
      msg +=
        ' (Press ' +
        chalk.cyan.bold('<space>') +
        ' to select, ' +
        chalk.cyan.bold('<Up/Down>') +
        ' rows, ' +
        chalk.cyan.bold('<Left/Right>') +
        ' columns, ' +
        chalk.cyan.bold('<Enter>') +
        ' to confirm)';
    }
    return msg;
  }

  private render(): void {
    const [firstIndex, lastIndex] = this.paginate();
    const table = new Table({
      head: [chalk.reset.dim(`${firstIndex + 1}-${lastIndex + 1} of ${this.rows.length}`)].concat(
        this.columns.map((c) => chalk.reset.bold(pluckName(c))),
      ),
    });

    for (let rowIndex = firstIndex; rowIndex <= lastIndex; rowIndex++) {
      const row = this.rows[rowIndex];
      if (!row) continue;
      const columnValues: string[] = [];
      for (let colIndex = 0; colIndex < this.columns.length; colIndex++) {
        const isSelected =
          this.status !== 'answered' && this.pointer === rowIndex && this.horizontalPointer === colIndex;
        const cellValue =
          getValue(this.columns[colIndex]) === this.values[rowIndex] ? figures.radioOn : figures.radioOff;
        columnValues.push(`${isSelected ? '[' : ' '} ${cellValue} ${isSelected ? ']' : ' '}`);
      }
      const chalkModifier =
        this.status !== 'answered' && this.pointer === rowIndex ? chalk.reset.bold.cyan : chalk.reset;
      table.push({ [chalkModifier(pluckName(row))]: columnValues });
    }

    const message = this.getMessage() + '\n\n' + table.toString();
    const lines = message.split('\n').length;

    const out = this.rl.output as NodeJS.WritableStream;
    if (this.lastHeight > 0) {
      out.write('\u001b[' + this.lastHeight + 'A\u001b[0J');
    }
    out.write(message);
    this.lastHeight = lines;
  }
}

export = TablePrompt;
