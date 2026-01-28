// @ts-ignore - no types available
import { highlight } from 'cardinal';
import chalk from 'chalk';
import isEmpty from 'lodash/isEmpty';
import MigrationLogger from './migration-logger';
import fs from 'fs';
import { readFile } from './fs-helper';
import groupBy from './group-by';

const getLineWithContext = (lines: string[], lineNumber: number, context: number): any => {
  const line = lineNumber - 1;

  const firstLine = line > context ? line - context : 0;
  const lastLine = line + context < lines.length ? line + context : lines.length;

  return {
    before: lines.slice(firstLine, line),
    line: lines[line],
    after: lines.slice(line + 1, lastLine + 1),
  };
};

function removeSpecialCharacter(str: string): string {
  return str.replace(/\u001b\[\d+m/g, '');
}

export default (errors: any, filePath?: string): void => {
  const logger = new MigrationLogger(process.env.CS_CLI_LOG_PATH ?? process.cwd());

  const errorsByFile = groupBy(errors, 'file');
  const messages: string[] = [];
  if (filePath) {
    if (errors.request) {
      errors.data = errors.request?.data;
      delete errors.request;
    }
    if (errors.message) {
      delete errors.message;
    }
    logger.log('error', { [filePath]: errors });
  } else {
    for (const file of Object.keys(errorsByFile)) {
      const errorLogs: any = {};
      errorLogs[file] = {};
      const fileContents = readFile(file);
      const highlightedCode = highlight(fileContents, { linenos: true });
      const lines = highlightedCode.split('\n');

      const fileErrorsMessage = chalk`{red Errors in ${file}}\n\n`;
      errorLogs[file].fileErrorsMessage = fileErrorsMessage.replace(/\u001b\[\d+m/g, '');
      const errorMessages = errorsByFile[file]
        .map((error: any) => {
          const callsite = error.meta.callsite;
          const context = 2;
          let { before, line, after } = getLineWithContext(lines, callsite.line, context);

          const beforeLines = before.map((_line: string) => chalk`${_line}\n`);
          const afterLines = after.map((_line: string) => chalk`${_line}\n`);
          const highlightedLine = chalk`{bold ${line}}\n`;

          before = removeSpecialCharacter(before.join('\n'));
          after = removeSpecialCharacter(after.join('\n'));
          line = removeSpecialCharacter(line);
          errorLogs[file].lines = { before, line, after };
          if (error.request) {
            error.data = error.request?.data;
            delete error.request;
          }
          if (error.message) {
            delete error.message;
          }
          const formattedCode = beforeLines + highlightedLine + afterLines;
          if (error.payload?.apiError) {
            errorLogs[file].apiError = true;
            errorLogs[file].errorCode = error.payload.apiError.errorCode;
            errorLogs[file].errors = error.payload.apiError.errors;
            errorLogs[file].data = error.data;
          }
          if (error.message && !error.payload.apiError) {
            errorLogs[file].apiError = false;
            errorLogs[file].error = error.message;
          }
        })
        .join('\n');

      messages.push(`${fileErrorsMessage}${errorMessages}`);
      logger.log('error', errorLogs);
    }
    if (errors?.request) {
      errors.data = errors.request?.data;
      delete errors.request;
    }
    if (errors?.message) {
      delete errors.message;
    }
    if (isEmpty(messages) && errors !== undefined && isEmpty(errorsByFile)) {
      logger.log('error', { errors: errors });
      console.log(chalk`{bold.red migration unsuccessful}`);
    } else {
      logger.log('error', { error: messages.join('\n') });
    }
  }
  // eslint-disable-next-line
  // console.log(chalk`{bold.red Migration unsuccessful}`);
};
