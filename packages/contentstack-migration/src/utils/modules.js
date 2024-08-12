const fs = require('fs');
const { execFileSync } = require('child_process');
const path = require('path');
const { sanitizePath } = require('@contentstack/cli-utilities');
const os = require('os');
const { builtinModules } = require('module');

const internalModules = new Set(builtinModules);

function checkWritePermissionToDirectory(directory) {
  try {
    fs.accessSync(directory, fs.constants.W_OK);
    return true;
  } catch (err) {
    console.log(`Permission Denied! You do not have the necessary write access for this directory.`);
    return false;
  }
}

function doesPackageJsonExist(directory) {
  return fs.existsSync(path.join(sanitizePath(directory), 'package.json'));
}

function scanDirectory(directory) {
  return fs.readdirSync(directory);
}

function scanFileForDependencies(directory, files) {
  const dependencies = new Set();

  files.forEach((file) => {
    const filePath = path.join(sanitizePath(directory), sanitizePath(file));
    if (path.extname(filePath) === '.js') {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      findModulesSync(fileContent).forEach((dep) => dependencies.add(dep));
    }
  });

  return [...dependencies];
}

function createPackageJson(directory) {
  const templateString = `{
    "name": "MigrationPackage",
    "version": "1.0.0",
    "main": "",
    "scripts": {},
    "keywords": [],
    "author": "",
    "license": "ISC",
    "description": ""
  }`;

  fs.writeFileSync(path.join(sanitizePath(directory), 'package.json'), templateString);
}

function installDependencies(dependencies, directory) {
  const installedDependencies = new Set();

  dependencies.forEach((dep) => {
    if (!internalModules.has(dep)) {
      const pkg = dep.startsWith('@') ? dep : dep.split('/')[0];
      if (!installedDependencies.has(pkg)) {
        executeShellCommand(`npm i ${pkg}`, directory);
        installedDependencies.add(pkg);
      }
    }
  });
}

function executeShellCommand(command, directory = '') {
  try {
    if (command.startsWith('npm i')) {
      const [cmd, ...args] = command.split(' ');
      execFileSync(cmd, args, { stdio: 'inherit', cwd: directory });
      console.log(`Command executed successfully: ${command}`);
    } else {
      console.log(`Command should only be 'npm i <package-name>'`);
    }
  } catch (error) {
    console.error(`Command execution failed. Error: ${error.message}`);
  }
}

async function installModules(filePath, multiple) {
  const files = multiple ? [] : [path.basename(filePath)];
  const dirPath = multiple ? filePath : path.dirname(filePath);

  if (checkWritePermissionToDirectory(dirPath)) {
    if (multiple) {
      files.push(...scanDirectory(dirPath));
    }

    if (files.length === 0) {
      console.log(`Error: Could not locate files needed to create package.json. Exiting the process.`);
      return true;
    }

    const dependencies = scanFileForDependencies(dirPath, files);

    if (!doesPackageJsonExist(dirPath)) {
      console.log(`package.json not found. Creating a new package.json...`);
      createPackageJson(dirPath);
    }

    installDependencies(dependencies, dirPath);
  } else {
    console.log(`You don't have write permission to the directory`);
    return false;
  }

  console.log(`All dependencies installed successfully.`);
  return true;
}

function findModulesSync(data) {
  try {
    const requireRegex = /require\(['"`](.*?)['"`]\)/g;
    const importRegex = /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"`](.*?)['"`]/g;

    const modules = new Set();
    let match;

    while ((match = requireRegex.exec(data)) !== null) {
      modules.add(match[1]);
    }

    while ((match = importRegex.exec(data)) !== null) {
      modules.add(match[1]);
    }

    return [...modules];
  } catch (error) {
    console.error(`Error reading file: ${error.message}`);
    return [];
  }
}

module.exports = installModules;
