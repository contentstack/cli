import ContentType from './content-types';
import { GroupFieldDataType, ModularBlocksDataType } from '../types';
import { log } from '@contentstack/cli-utilities';

export default class GlobalField extends ContentType {
  /**
   * The above function is an asynchronous function that runs a validation and returns any missing
   * references.
   * @returns the value of the variable `missingRefs`.
   */
  async run(returnFixSchema = false) {
    log.debug(`Starting GlobalField audit process`);
    log.debug(`Return fix schema: ${returnFixSchema}`);
    
    // NOTE add any validation if required
    log.debug(`Calling parent ContentType.run() method`);
    const missingRefs = await super.run(returnFixSchema);
    log.debug(`Parent method completed, found ${Object.keys(missingRefs || {}).length} missing references`);

    log.debug(`GlobalField audit completed`);
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
    log.debug(`[GLOBAL-FIELDS] Validating modular blocks field: ${field.uid}`);
    log.debug(`Tree depth: ${tree.length}`);
    
    const { blocks } = field;
    log.debug(`Found ${blocks.length} blocks to validate`);

    // NOTE Traverse each and every module and look for reference
    for (const block of blocks) {
      log.debug(`Validating block: ${block.uid} (${block.title})`);
      await this.lookForReference(tree, block);
      log.debug(`Block validation completed: ${block.uid}`);
    }
    
    log.debug(`[GLOBAL-FIELDS] Modular blocks field validation completed: ${field.uid}`);
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
    log.debug(`[GLOBAL-FIELDS] Validating group field: ${field.uid} (${field.display_name})`);
    log.debug(`Tree depth: ${tree.length}`);
    
    // NOTE Any Group Field related logic can be added here (Ex data serialization or picking any metadata for report etc.,)
    const updatedTree = [...tree, { uid: field.uid, name: field.display_name }];
    log.debug(`Updated tree depth: ${updatedTree.length}`);
    
    await this.lookForReference(updatedTree, field);
    log.debug(`[GLOBAL-FIELDS] Group field validation completed: ${field.uid}`);
  }
}
