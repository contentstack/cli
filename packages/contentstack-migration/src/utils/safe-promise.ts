export default (promise: Promise<any>): Promise<[Error | null, any]> => {
  return promise.then((res: any) => [null, res] as [null, any]).catch((err: any) => [err, null] as [Error, null]);
};
