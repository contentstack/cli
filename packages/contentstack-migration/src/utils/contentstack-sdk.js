'use strict';
/** Dependencies */

// Map helper
const { getMapInstance, getDataWithAction, get } = require('./map');
// Constants
const { MANAGEMENT_SDK, SDK_ACTIONS } = require('./constants');
// List of actions
const {
  CONTENTTYPE_DELETE,
  CONTENTTYPE_GET,
  CONTENTTYPE_POST,
  CONTENTTYPE_PUT,
  LOCALES_GET,
  ENTRY_DELETE,
  ENTRY_GET,
  ENTRY_POST,
  ENTRY_PUBLISH,
  ENTRY_PUT,
} = SDK_ACTIONS;

module.exports = ({ action, id, sdkAction }) => {
  return async (_data) => {
    _data = getData(_data, id, action);

    const mapInstance = getMapInstance();
    const managementSdk = get(MANAGEMENT_SDK, mapInstance);
    const { stack } = managementSdk;

    let response;

    switch (sdkAction) {
      case CONTENTTYPE_GET:
        response = await stack.contentType(id).fetch();
        return response;
      case CONTENTTYPE_POST:
        response = await stack.contentType().create(_data);
        return response;
      case CONTENTTYPE_PUT:
        // const contentType = await stack.contentType(id).fetch();
        response = await stack.contentType(_data).update();
        return response;
      case CONTENTTYPE_DELETE:
        response = await stack.contentType(id).delete();
        return response;
      case LOCALES_GET:
        return response;
      case ENTRY_GET:
        return response;
      case ENTRY_POST:
        return response;
      case ENTRY_PUBLISH:
        return response;
      case ENTRY_DELETE:
        return response;
      case ENTRY_PUT:
        return response;
      default:
    }
  };
};

function getData(_data, id, action) {
  let mapInstance = getMapInstance();

  let data = _data ? _data : getDataWithAction(id, mapInstance, action);

  // return stringify(data);
  return data;
}
