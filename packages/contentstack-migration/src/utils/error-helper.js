'use strict';

const { highlight } = require('cardinal'),
  { keys } = Object,
  chalk = require('chalk'),

  { readFile } = require('./fs-helper'),
  groupBy = require('./group-by');

module.exports = errors => {
  const errorsByFile = groupBy(errors, 'file');

  const messages = [];

  for (const file of keys(errorsByFile)) {
    const fileContents = readFile(file);
    const highlightedCode = highlight(fileContents, { linenos: true });
    const lines = highlightedCode.split('\n');

    const fileErrorsMessage = chalk`{red Errors in ${file}}\n\n`;
    const errorMessages = errorsByFile[file].map(error => {
      const callsite = error.meta.callsite;
      const context = 2;
      const { before, line, after } = getLineWithContext(lines, callsite.line, context);

      const beforeLines = before.map(line => chalk`${line}\n`);
      const afterLines = after.map(line => chalk`${line}\n`);
      const highlightedLine = chalk`{bold ${line}}\n`;

      const formattedCode = beforeLines + highlightedLine + afterLines;
      return chalk`{red Line ${String(callsite.line)}:} {bold ${error.payload.apiError.message}}\n${formattedCode}`;
    }).join('\n');

    messages.push(`${fileErrorsMessage}${errorMessages}`);
  }
  // eslint-disable-next-line
  console.error(chalk`{red.bold Validation failed}\n\n`);
  // eslint-disable-next-line
  console.error(messages.join('\n'));
  // eslint-disable-next-line
  console.error(chalk`{bold.red Migration unsuccessful}`);
};

const getLineWithContext = (lines, lineNumber, context) => {
  const line = (lineNumber - 1);

  const firstLine = (line > context) ? (line - context) : 0;
  const lastLine = (line + context) < lines.length ? line + context : lines.length;

  return {
    before: lines.slice(firstLine, line),
    line: lines[line],
    after: lines.slice(line + 1, lastLine + 1)
  };
};
