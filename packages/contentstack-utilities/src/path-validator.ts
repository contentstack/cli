import { normalize, resolve } from 'path';

export const pathValidator = (filePath: string) => {
  return normalize(resolve(process.cwd(), filePath)).replace(
    /^(\.\.(\/|\\|$))+/,
    ""
  );;
};