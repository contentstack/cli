type IncludeFlags<T, K extends keyof T> = Pick<T, K>;

type CommandNames = 'cm:stacks:audit' | 'cm:stacks:audit:fix';

interface AnyProperty {
  [propName: string]: any;
}

export { IncludeFlags, CommandNames, AnyProperty };
