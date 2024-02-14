const { highlight } = require('cardinal');
const { keys } = Object;
const chalk = require('chalk');
const isEmpty = require('lodash/isEmpty')

const { readFile } = require('./fs-helper');
const groupBy = require('./group-by');

const getLineWithContext = (lines, lineNumber, context) => {
  const line = lineNumber - 1;

  const firstLine = line > context ? line - context : 0;
  const lastLine = line + context < lines.length ? line + context : lines.length;

  return {
    before: lines.slice(firstLine, line),
    line: lines[line],
    after: lines.slice(line + 1, lastLine + 1),
  };
};

module.exports = (errors) => {
  const errorsByFile = groupBy(errors, 'file');
  const messages = [];
  for (const file of keys(errorsByFile)) {
    const fileContents = readFile(file);
    const highlightedCode = highlight(fileContents, { linenos: true });
    const lines = highlightedCode.split('\n');

    const fileErrorsMessage = chalk`{red Errors in ${file}}\n\n`;
    const errorMessages = errorsByFile[file]
      .map((error) => {
        const callsite = error.meta.callsite;
        const context = 2;
        const { before, line, after } = getLineWithContext(lines, callsite.line, context);

        const beforeLines = before.map((_line) => chalk`${_line}\n`);
        const afterLines = after.map((_line) => chalk`${_line}\n`);
        const highlightedLine = chalk`{bold ${line}}\n`;

        const formattedCode = beforeLines + highlightedLine + afterLines;
        if (error.payload.apiError) {
          return chalk`{red Line ${String(callsite.line)}:} {bold ${error.payload.apiError.message}}\n${formattedCode}`;
        }
        if (error.message) {
          return chalk`{red Line ${String(callsite.line)}:} {bold ${error.message}}\n${formattedCode}`;
        }
        return chalk`{red Line ${String(callsite.line)}:} {bold something went wrong here.}\n${formattedCode}`;
      })
      .join('\n');

    messages.push(`${fileErrorsMessage}${errorMessages}`);
  }
  if (isEmpty(messages) && errors?.length) {
    console.error('Migration error---', errors);
  } else {
    console.log(messages.join('\n'));
  }
  // eslint-disable-next-line
  console.log(chalk`{bold.red Migration unsuccessful}`);
};
