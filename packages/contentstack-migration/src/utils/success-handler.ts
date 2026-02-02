import { success } from './logger';
import { successMessageHandler } from './constants';

export default (data: any, type: string, method: string): void => {
  if (data && type && method) {
    //success(`Successfully ${successMessageHandler[method]} ${type}: ${data}`);
  } else {
    success(`${type} successfully completed`);
  }
};
