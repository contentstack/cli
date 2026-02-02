export default class BaseValidator {
  commonValidate(properties: any[], data: any): any[] {
    const errors: any[] = [];
    const opts = data.payload.options;
    const dataKeys = Object.keys(opts);

    for (let i = 0; i < properties.length; i++) {
      let prop = properties[i];
      // Check if property is mandatory but not present in user specified params
      if (prop.mandatory && !dataKeys.includes(prop.name)) {
        errors.push({ ...data, message: `${prop.name} is required.` });
      }

      if (prop.name in opts) {
        const dataType = this.getDataType(opts[prop.name]);
        if (dataType !== prop.type) {
          errors.push({ ...data, message: `${prop.name} is a ${dataType} type` });
        }

        if (prop.dependsOn && !(prop.dependsOn in opts) && opts[prop.name]) {
          errors.push({ ...data, message: `${prop.dependsOn} is required with ${prop.name}` });
        }
      }
    }

    return errors;
  }

  getDataType(data: any): string {
    if (Array.isArray(data)) {
      return 'array';
    }
    return typeof data;
  }
}
