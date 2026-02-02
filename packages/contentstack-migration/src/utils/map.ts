import { mapObject, actionMapper, requests } from './constants';

export const getMapInstance = (): Map<string, any> => {
  return mapObject;
};

export const get = (id: string, mapInstance: Map<string, any>, data: any = []): any => {
  // Create key if does not exist
  let __data = mapInstance.get(id);

  if (!__data) {
    mapInstance.set(id, data);
    __data = mapInstance.get(id);
  }

  return __data;
};

export const set = (id: string, mapInstance: Map<string, any>, data: any): Map<string, any> => {
  return mapInstance.set(id, data);
};

export const remove = (id: string, mapInstance: Map<string, any>): boolean => {
  return mapInstance.delete(id);
};

export const getDataWithAction = (id: string, mapInstance: Map<string, any>, action: string): any => {
  let data = get(id, mapInstance);
  data = data[action];
  return data;
};

export const resetMapInstance = (mapInstance: Map<string, any>): void => {
  set(actionMapper, mapInstance, []);
  set(requests, mapInstance, []);
};

export const deleteMap = (): void => { };
