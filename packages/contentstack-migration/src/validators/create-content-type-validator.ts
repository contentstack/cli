// Utils
import { map as _map, constants } from '../utils';
// Properties
const { getMapInstance, get } = _map;
const { contentTypeProperties } = constants;

const mandatoryKeys = ['uid', 'title', 'description'];

export default class CreateContentTypeValidator {
  errors: any[];

  constructor() {
    // super();
    this.errors = [];
  }

  validate(data: any): any[] {
    // Validate the latest updated object in the global map object
    const mapInstance = getMapInstance();
    const mapObj = get(data.payload.contentTypeId, mapInstance);
    const actionObj = mapObj[data.payload.action].content_type;
    const userProvidedFields = Object.keys(actionObj);

    for (const key of mandatoryKeys) {
      if (!Object.keys(actionObj).includes(key) || !actionObj[key]) {
        data = { ...data, message: `${key} is missing.` };
        this.errors.push(data);
      }
    }

    // TODO: Fix error messages
    const propertyNames = this.getPropertyNames();

    for (let i = 0; i < userProvidedFields.length; i++) {
      let key = userProvidedFields[i];
      if (!propertyNames.includes(key)) {
        data = { ...data, message: `${key} is not valid property.` };
        this.errors.push(data);
      }
    }
    return this.errors;
  }

  isApplicable(action: any): boolean {
    return action.type === 'create';
  }

  getPropertyNames(): string[] {
    return contentTypeProperties;
  }
}
