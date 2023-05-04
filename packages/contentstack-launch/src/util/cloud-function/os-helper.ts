import fs from 'fs';
import { join, normalize } from "path";

export async function* walkFileSystem(directory: string): any {
  const fileSystemIterator = await fs.promises.opendir(directory);

  for await (const fileSystemElement of fileSystemIterator) {
    const filePath = normalize(join(directory, fileSystemElement.name)).replace(
      /^(\.\.(\/|\\|$))+/,
      ""
    );

    if (fileSystemElement.isDirectory()) {
      yield* walkFileSystem(filePath);
    } else if (fileSystemElement.isFile()) {
      yield filePath;
    }
  }
}

export function checkIfDirectoryExists(directoryPath: string): boolean {
  return fs.existsSync(directoryPath);
}