import fs from 'fs';
import { spawnSync } from 'child_process';
import path from 'path';
import { sanitizePath } from '@contentstack/cli-utilities';
import os from 'os';
import { builtinModules } from 'module';

const internalModules = new Set(builtinModules);

function checkWritePermissionToDirectory(directory: string): boolean {
  try {
    fs.accessSync(directory, fs.constants.W_OK);
    return true;
  } catch (err) {
    console.log(`Permission denied. You do not have the necessary write access for this directory.`);
    return false;
  }
}

function doesPackageJsonExist(directory: string): boolean {
  return fs.existsSync(path.join(sanitizePath(directory), 'package.json'));
}

function scanDirectory(directory: string): string[] {
  return fs.readdirSync(directory);
}

function scanFileForDependencies(directory: string, files: string[]): string[] {
  const dependencies = new Set<string>();

  files.forEach((file) => {
    const filePath = path.join(sanitizePath(directory), sanitizePath(file));
    if (path.extname(filePath) === '.js') {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      findModulesSync(fileContent).forEach((dep) => dependencies.add(dep));
    }
  });

  return [...dependencies];
}

function createPackageJson(directory: string): void {
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

function installDependencies(dependencies: string[], directory: string): void {
  const installedDependencies = new Set<string>();

  dependencies.forEach((dep) => {
    if (!internalModules.has(dep)) {
      const pkg = dep.startsWith('@') ? dep : dep.split('/')[0];
      if (!installedDependencies.has(pkg)) {
        executeShellCommand(pkg, directory);
        installedDependencies.add(pkg);
      }
    }
  });
}

function executeShellCommand(pkg: string, directory: string = ''): void {
  try {
    const result = spawnSync(`npm`, ['i', pkg], { stdio: 'inherit', cwd: directory, shell: false });
    if (result?.error) throw result.error;
    console.log(`Command executed successfully`);
  } catch (error: any) {
    console.error(`Command execution failed. Error: ${error?.message}`);
  }
}

async function installModules(filePath: string, multiple: boolean): Promise<boolean> {
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

function findModulesSync(data: string): string[] {
  try {
    const requireRegex = /require\(['"`](.*?)['"`]\)/g;
    const importRegex = /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"`](.*?)['"`]/g;

    const modules = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = requireRegex.exec(data)) !== null) {
      modules.add(match[1]);
    }

    while ((match = importRegex.exec(data)) !== null) {
      modules.add(match[1]);
    }

    return [...modules];
  } catch (error: any) {
    console.error(`Error reading file: ${error.message}`);
    return [];
  }
}

export default installModules;
