import ContentType from './content-types';
import { GroupFieldDataType, ModularBlocksDataType } from '../types';

export default class GlobalField extends ContentType {
  /**
   * The above function is an asynchronous function that runs a validation and returns any missing
   * references.
   * @returns the value of the variable `missingRefs`.
   */
  async run(returnFixSchema = false) {
    // NOTE add any validation if required
    const missingRefs = await super.run(returnFixSchema);

    return missingRefs;
  }

  /**
   * The function validates a field containing modular blocks by traversing each block and checking for
   * references in a given tree.
   * @param {Record<string, unknown>[]} tree - The `tree` parameter is an array of objects that
   * represents a tree structure. Each object in the array represents a node in the tree.
   * @param {ModularBlocksDataType} field - The `field` parameter is of type `ModularBlocksDataType`.
   */
  async validateModularBlocksField(tree: Record<string, unknown>[], field: ModularBlocksDataType): Promise<void> {
    const { blocks } = field;

    // NOTE Traverse each and every module and look for reference
    for (const block of blocks) {
      await this.lookForReference(tree, block);
    }
  }

  /**
   * The function "validateGroupField" performs group field validation by looking for a reference in a
   * tree structure.
   * @param {Record<string, unknown>[]} tree - The `tree` parameter is an array of objects representing
   * a tree structure. Each object in the array represents a node in the tree and has properties like
   * `uid` and `name`.
   * @param {GroupFieldDataType} field - The `field` parameter is of type `GroupFieldDataType`.
   */
  async validateGroupField(tree: Record<string, unknown>[], field: GroupFieldDataType): Promise<void> {
    // NOTE Any Group Field related logic can be added here (Ex data serialization or picking any metadata for report etc.,)
    await this.lookForReference([...tree, { uid: field.uid, name: field.display_name }], field);
  }
}
