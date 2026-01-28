export const getEntryObj = (fields: string[], obj: any): any => {
  let entryObj: any = {};
  fields.forEach((field) => {
    entryObj[field] = obj[field];
  });
  return entryObj;
};
