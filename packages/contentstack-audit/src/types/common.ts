import { ux } from "@contentstack/cli-utilities";

type IFlags = typeof ux.table.Flags;
type IncludeFlags<T, K extends keyof T> = Pick<T, K>;

type CommandNames = 'cm:stacks:audit' | 'cm:stacks:audit:fix';

interface AnyProperty {
  [propName: string]: any;
}

export { IFlags, IncludeFlags, CommandNames, AnyProperty };
