// Dependencies
import { request } from 'https';

// Map helper
import { getMapInstance, getDataWithAction } from './map';

// constants
import { actions, nonWritableMethods } from './constants';

// Properties
const { DELETE_CT } = actions;

export default ({
  hostname,
  path,
  headers,
  method,
  id,
  action,
}: {
  hostname: string;
  path: string;
  headers: any;
  method: string;
  id: string;
  action: string;
}) => {
  let options: any = {
    hostname,
    path,
    headers,
    method,
    id,
    action,
  };
  return (_data: any) => {
    // get data here using id and action
    let data = getData(_data, id, action, method);
    // Special handling for non writable methods
    options = getNewOptions(options, data, action, method);

    return new Promise((resolve, reject) => {
      const req = request(options, (res) => {
        let response = '';

        res.on('data', (_res) => {
          response += _res.toString();
        });

        res.on('end', () => {
          try {
            response = JSON.parse(response);
            resolve(response);
          } catch (err) {
            reject('Error while parsing response!');
            // throw new Error('Error while parsing response!');
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      !nonWritableMethods.includes(method) && req.write(data);
      req.end();
    });
  };
};

function getData(_data: any, id: string, action: string, method: string): string | undefined {
  if (method === 'GET') return;
  // if (!nonWritableMethods.includes(method)) {
  let mapInstance = getMapInstance();

  let data = _data ? _data : getDataWithAction(id, mapInstance, action);
  return JSON.stringify(data);
}

function getNewOptions(options: any, data: string | undefined, action: string, method: string): any {
  // Special handling for delete method
  if (action === DELETE_CT) {
    try {
      data = JSON.parse(data as string);
    } catch (err) {
      throw 'Error while parsing data for delete operation';
    }
    options.path = `${options.path}?force=${(data as any).content_type.force}`;
  }

  if (!nonWritableMethods.includes(method) && data) {
    options.headers['Content-Length'] = data.length;
  } else {
    delete options.headers['Content-Type'];
    delete options.headers['Content-Length'];
  }

  return options;
}
