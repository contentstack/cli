import httpClient, { HttpClient } from './index';

try {
  httpClient
    .headers({ token: 'test' })
    .get(
      'https://images.contentstack.io/v3/assets/***REMOVED***/***REMOVED***/620e562ac452407a5173d743/cierra-vega.svg',
    )
    .then((response) => {
      console.log('response', response.data());
    })
    .catch((error) => {
      console.log('error1', error);
    });
  httpClient
    .headers({ token: 'test1' })
    .get(
      'https://images.contentstack.io/v3/assets/***REMOVED***/***REMOVED***/620e562ac452407a5173d743/cierra-vega.svg',
    )
    .then((response) => {
      console.log('response', response.data());
    })
    .catch((error) => {
      console.log('error1', error);
    });
} catch (error) {
  console.log('error', error);
}
