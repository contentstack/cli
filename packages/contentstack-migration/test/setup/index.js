'use strict';

const { spawn } = require('child_process');
const { resolve } = require('path');
const concat = require('concat-stream');

const constants = require('./constants');
const { startPoint, CONTENTSTACK_API_KEY, CONTENTSTACK_AUTHTOKEN } = constants;

function createProcess(processPath = '', args = [], env = null) {
  const cwd = resolve();

  env = { ...process.env };

  env.NODE_ENV = 'test';
  env.CONTENTSTACK_API_KEY = CONTENTSTACK_API_KEY;
  env.CONTENTSTACK_AUTHTOKEN = CONTENTSTACK_AUTHTOKEN;

  // args[args.length - 1]
  return spawn(startPoint, args, { env, cwd });
}

// A promise wrapper over child process to create
function execute(processPath, args = [], opts = {}) {
  const { env = null } = opts;

  const childProcess = createProcess(processPath, args, env);
  childProcess.stdin.setEncoding('utf-8');

  return new Promise((res, reject) => {
    childProcess.stderr.once('data', (err) => {
      reject(err.toString());
    });

    childProcess.on('error', (code) => {
      return reject(code);
    });

    childProcess.stdout.pipe(concat((result) => res(result.toString())));
  });
}

exports.execute = execute;
exports.constants = constants;
