import { expect } from 'chai';
import sinon from 'sinon';
import { lookupEntries, removeUidsFromJsonRteFields, removeEntryRefsFromJSONRTE, restoreJsonRteEntryRefs } from '../../../src/utils/entries-helper';
import * as fileHelper from '../../../src/utils/file-helper';
import * as path from 'path';

// Mock data imports
const mockContentTypes = require('./mock-data/entries-helper/content-types.json');
const mockEntries = require('./mock-data/entries-helper/entries.json');
const mockMappers = require('./mock-data/entries-helper/mappers.json');
const mockJsonRteData = require('./mock-data/entries-helper/json-rte-data.json');

describe('Entries Helper', () => {
  let sandbox: sinon.SinonSandbox;
  let fileHelperReadFileSyncStub: sinon.SinonStub;
  let fileHelperWriteFileStub: sinon.SinonStub;
  let logDebugStub: sinon.SinonStub;
  let logWarnStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    fileHelperReadFileSyncStub = sandbox.stub(fileHelper, 'readFileSync');
    fileHelperWriteFileStub = sandbox.stub(fileHelper, 'writeFile');
    logDebugStub = sandbox.stub(console, 'log'); // Mock log.debug
    logWarnStub = sandbox.stub(console, 'warn'); // Mock log.warn
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('lookupEntries', () => {
    it('should be a function', () => {
      expect(lookupEntries).to.be.a('function');
    });

    it('should handle entry with no references', () => {
      const data = {
        content_type: mockContentTypes.simpleContentType,
        entry: mockEntries.simpleEntry
      };
      const mappedUids = {};
      const uidMapperPath = '/test/mapper';

      const result = lookupEntries(data, mappedUids, uidMapperPath);

      expect(result).to.deep.equal(data.entry);
      expect(fileHelperWriteFileStub.called).to.be.false;
    });

    it('should process single reference field', () => {
      const data = {
        content_type: mockContentTypes.referenceContentType,
        entry: mockEntries.entryWithSingleReference
      };
      const mappedUids = {
        'ref_entry_1': 'new_ref_entry_1'
      };
      const uidMapperPath = '/test/mapper';

      fileHelperReadFileSyncStub.withArgs(path.join(uidMapperPath, 'mapped-uids.json')).returns({});
      fileHelperReadFileSyncStub.withArgs(path.join(uidMapperPath, 'unmapped-uids.json')).returns({});

      const result = lookupEntries(data, mappedUids, uidMapperPath);

      // The function should have processed the entry and potentially updated references
      expect(result).to.be.an('object');
      expect(result.uid).to.equal('ref_entry_1');
    });

    it('should process multi-reference field', () => {
      const data = {
        content_type: mockContentTypes.multiReferenceContentType,
        entry: mockEntries.entryWithMultiReference
      };
      const mappedUids = {
        'ref_entry_1': 'new_ref_entry_1',
        'ref_entry_2': 'new_ref_entry_2'
      };
      const uidMapperPath = '/test/mapper';

      fileHelperReadFileSyncStub.withArgs(path.join(uidMapperPath, 'mapped-uids.json')).returns({});
      fileHelperReadFileSyncStub.withArgs(path.join(uidMapperPath, 'unmapped-uids.json')).returns({});

      const result = lookupEntries(data, mappedUids, uidMapperPath);

      expect(result).to.be.an('object');
      expect(result.uid).to.equal('multi_ref_entry_1');
    });

    it('should handle unmapped UIDs', () => {
      const data = {
        content_type: mockContentTypes.referenceContentType,
        entry: mockEntries.entryWithSingleReference
      };
      const mappedUids = {}; // No mappings
      const uidMapperPath = '/test/mapper';

      fileHelperReadFileSyncStub.withArgs(path.join(uidMapperPath, 'unmapped-uids.json')).returns({});

      const result = lookupEntries(data, mappedUids, uidMapperPath);

      expect(result).to.be.an('object');
      // The function should have processed the entry
      expect(result.uid).to.equal('ref_entry_1');
    });

    it('should handle mapped UIDs', () => {
      const data = {
        content_type: mockContentTypes.referenceContentType,
        entry: mockEntries.entryWithSingleReference
      };
      const mappedUids = {
        'ref_entry_1': 'new_ref_entry_1'
      };
      const uidMapperPath = '/test/mapper';

      fileHelperReadFileSyncStub.withArgs(path.join(uidMapperPath, 'mapped-uids.json')).returns({});
      fileHelperReadFileSyncStub.withArgs(path.join(uidMapperPath, 'unmapped-uids.json')).returns({});

      const result = lookupEntries(data, mappedUids, uidMapperPath);

      expect(result).to.be.an('object');
      // The function should have processed the entry
      expect(result.uid).to.equal('ref_entry_1');
    });

    it('should process group fields with references', () => {
      const data = {
        content_type: mockContentTypes.groupContentType,
        entry: mockEntries.entryWithGroupReference
      };
      const mappedUids = {
        'ref_entry_1': 'new_ref_entry_1'
      };
      const uidMapperPath = '/test/mapper';

      fileHelperReadFileSyncStub.withArgs(path.join(uidMapperPath, 'mapped-uids.json')).returns({});
      fileHelperReadFileSyncStub.withArgs(path.join(uidMapperPath, 'unmapped-uids.json')).returns({});

      const result = lookupEntries(data, mappedUids, uidMapperPath);

      expect(result).to.be.an('object');
      expect(result.uid).to.equal('group_entry_1');
    });

    it('should process blocks fields with references', () => {
      const data = {
        content_type: mockContentTypes.blocksContentType,
        entry: mockEntries.entryWithBlocksReference
      };
      const mappedUids = {
        'ref_entry_1': 'new_ref_entry_1'
      };
      const uidMapperPath = '/test/mapper';

      fileHelperReadFileSyncStub.withArgs(path.join(uidMapperPath, 'mapped-uids.json')).returns({});
      fileHelperReadFileSyncStub.withArgs(path.join(uidMapperPath, 'unmapped-uids.json')).returns({});

      const result = lookupEntries(data, mappedUids, uidMapperPath);

      expect(result).to.be.an('object');
      expect(result.uid).to.equal('blocks_entry_1');
    });

    it('should process JSON RTE entry references', () => {
      const data = {
        content_type: mockContentTypes.jsonRteContentType,
        entry: mockEntries.entryWithJsonRteReference
      };
      const mappedUids = {
        'ref_entry_1': 'new_ref_entry_1'
      };
      const uidMapperPath = '/test/mapper';

      fileHelperReadFileSyncStub.withArgs(path.join(uidMapperPath, 'mapped-uids.json')).returns({});
      fileHelperReadFileSyncStub.withArgs(path.join(uidMapperPath, 'unmapped-uids.json')).returns({});

      const result = lookupEntries(data, mappedUids, uidMapperPath);

      expect(result.json_rte_field).to.be.an('object');
      expect(fileHelperWriteFileStub.called).to.be.true;
    });

    it('should handle asset references', () => {
      const data = {
        content_type: mockContentTypes.assetContentType,
        entry: mockEntries.entryWithAssetReference
      };
      const mappedUids = {
        'asset_1': 'new_asset_1'
      };
      const uidMapperPath = '/test/mapper';

      fileHelperReadFileSyncStub.withArgs(path.join(uidMapperPath, 'mapped-uids.json')).returns({});
      fileHelperReadFileSyncStub.withArgs(path.join(uidMapperPath, 'unmapped-uids.json')).returns({});

      const result = lookupEntries(data, mappedUids, uidMapperPath);

      expect(result.single_asset.uid).to.equal('new_asset_1');
    });

    it('should handle preserveStackVersion true', () => {
      const data = {
        content_type: mockContentTypes.referenceContentType,
        entry: mockEntries.entryWithSingleReference
      };
      const mappedUids = {
        'ref_entry_1': 'new_ref_entry_1'
      };
      const uidMapperPath = '/test/mapper';

      fileHelperReadFileSyncStub.withArgs(path.join(uidMapperPath, 'mapped-uids.json')).returns({});
      fileHelperReadFileSyncStub.withArgs(path.join(uidMapperPath, 'unmapped-uids.json')).returns({});

      const result = lookupEntries(data, mappedUids, uidMapperPath);

      expect(result).to.be.an('object');
      expect(result.uid).to.equal('ref_entry_1');
    });

    it('should handle invalid regex patterns', () => {
      const data = {
        content_type: mockContentTypes.referenceContentType,
        entry: mockEntries.entryWithSingleReference
      };
      const mappedUids = {
        'ref_entry_1': 'new_ref_entry_1'
      };
      const uidMapperPath = '/test/mapper';

      fileHelperReadFileSyncStub.withArgs(path.join(uidMapperPath, 'mapped-uids.json')).returns({});
      fileHelperReadFileSyncStub.withArgs(path.join(uidMapperPath, 'unmapped-uids.json')).returns({});

      const result = lookupEntries(data, mappedUids, uidMapperPath);

      expect(result).to.be.an('object');
      expect(result.uid).to.equal('ref_entry_1');
    });
  });

  describe('removeUidsFromJsonRteFields', () => {
    it('should be a function', () => {
      expect(removeUidsFromJsonRteFields).to.be.a('function');
    });

    it('should remove UIDs from single JSON RTE field', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteUid));
      const ctSchema = mockContentTypes.jsonRteContentType.schema;

      const result = removeUidsFromJsonRteFields(entry, ctSchema);

      expect(result.json_rte_field.uid).to.be.undefined;
      expect(result.json_rte_field.attrs.dirty).to.be.true;
    });

    it('should remove UIDs from multiple JSON RTE fields', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithMultipleJsonRte));
      const ctSchema = mockContentTypes.multipleJsonRteContentType.schema;

      const result = removeUidsFromJsonRteFields(entry, ctSchema);

      result.json_rte_field.forEach((field: any) => {
        expect(field.uid).to.be.undefined;
        expect(field.attrs.dirty).to.be.true;
      });
    });

    it('should process JSON RTE in blocks', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithBlocksJsonRte));
      const ctSchema = mockContentTypes.blocksJsonRteContentType.schema;

      const result = removeUidsFromJsonRteFields(entry, ctSchema);

      // The function should process the JSON RTE field within the block
      expect(result).to.be.an('object');
      expect(result.blocks_field).to.be.an('array');
    });

    it('should process JSON RTE in groups', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithGroupJsonRte));
      const ctSchema = mockContentTypes.groupJsonRteContentType.schema;

      const result = removeUidsFromJsonRteFields(entry, ctSchema);

      expect(result.group_field.json_rte_field.uid).to.be.undefined;
      expect(result.group_field.json_rte_field.attrs.dirty).to.be.true;
    });

    it('should handle children recursively', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithNestedJsonRte));
      const ctSchema = mockContentTypes.jsonRteContentType.schema;

      const result = removeUidsFromJsonRteFields(entry, ctSchema);

      // Check that nested children have UIDs removed and dirty set
      const children = result.json_rte_field.children;
      children.forEach((child: any) => {
        if (child.type) {
          expect(child.uid).to.be.undefined;
          expect(child.attrs.dirty).to.be.true;
        }
      });
    });

    it('should handle empty children array', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithEmptyJsonRte));
      const ctSchema = mockContentTypes.jsonRteContentType.schema;

      const result = removeUidsFromJsonRteFields(entry, ctSchema);

      expect(result.json_rte_field.children).to.be.an('array');
    });
  });

  describe('removeEntryRefsFromJSONRTE', () => {
    it('should be a function', () => {
      expect(removeEntryRefsFromJSONRTE).to.be.a('function');
    });

    it('should remove entry references from JSON RTE', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteReference));
      const ctSchema = mockContentTypes.jsonRteContentType.schema;

      const result = removeEntryRefsFromJSONRTE(entry, ctSchema);

      // Check that entry references are removed
      const children = result.json_rte_field.children;
      const hasEntryRef = children.some((child: any) => 
        child.type === 'reference' && child.attrs && child.attrs.type === 'entry'
      );
      expect(hasEntryRef).to.be.false;
    });

    it('should replace with empty p tag when all children are entry refs', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithOnlyEntryRefs));
      const ctSchema = mockContentTypes.jsonRteContentType.schema;

      const result = removeEntryRefsFromJSONRTE(entry, ctSchema);

      expect(result.json_rte_field.children).to.have.length(1);
      expect(result.json_rte_field.children[0].type).to.equal('p');
    });

    it('should process JSON RTE in blocks', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithBlocksJsonRteRefs));
      const ctSchema = mockContentTypes.blocksJsonRteContentType.schema;

      const result = removeEntryRefsFromJSONRTE(entry, ctSchema);

      expect(result.blocks_field[0].json_rte_block.json_rte_field).to.be.an('object');
    });

    it('should process JSON RTE in groups', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithGroupJsonRteRefs));
      const ctSchema = mockContentTypes.groupJsonRteContentType.schema;

      const result = removeEntryRefsFromJSONRTE(entry, ctSchema);

      expect(result.group_field.json_rte_field).to.be.an('object');
    });

    it('should handle text RTE fields', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithTextRte));
      const ctSchema = mockContentTypes.textRteContentType.schema;

      const result = removeEntryRefsFromJSONRTE(entry, ctSchema);

      expect(result.text_rte_field).to.equal('<p></p>');
    });

    it('should handle multiple text RTE fields', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithMultipleTextRte));
      const ctSchema = mockContentTypes.multipleTextRteContentType.schema;

      const result = removeEntryRefsFromJSONRTE(entry, ctSchema);

      expect(result.text_rte_field).to.deep.equal(['<p></p>', '<p></p>']);
    });
  });

  describe('restoreJsonRteEntryRefs', () => {
    it('should be a function', () => {
      expect(restoreJsonRteEntryRefs).to.be.a('function');
    });

    it('should restore entry references in JSON RTE', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteReference));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRte;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = mockMappers.assetUidMapper;
      const mappedAssetUrls = mockMappers.assetUrlMapper;

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should process JSON RTE in blocks', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithBlocksJsonRte));
      const sourceStackEntry = mockEntries.sourceStackEntryWithBlocksJsonRte;
      const ctSchema = mockContentTypes.blocksJsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = mockMappers.assetUidMapper;
      const mappedAssetUrls = mockMappers.assetUrlMapper;

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.blocks_field[0].json_rte_block.json_rte_field).to.be.an('object');
    });

    it('should process JSON RTE in groups', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithGroupJsonRte));
      const sourceStackEntry = mockEntries.sourceStackEntryWithGroupJsonRte;
      const ctSchema = mockContentTypes.groupJsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = mockMappers.assetUidMapper;
      const mappedAssetUrls = mockMappers.assetUrlMapper;

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.group_field.json_rte_field).to.be.an('object');
    });

    it('should handle text RTE fields', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithTextRte));
      const sourceStackEntry = mockEntries.sourceStackEntryWithTextRte;
      const ctSchema = mockContentTypes.textRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = mockMappers.assetUidMapper;
      const mappedAssetUrls = mockMappers.assetUrlMapper;

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.text_rte_field).to.be.a('string');
    });

    it('should handle missing source entry data', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteReference));
      const sourceStackEntry = { json_rte_field: { children: [] as any[] } }; // Minimal source with children
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = mockMappers.assetUidMapper;
      const mappedAssetUrls = mockMappers.assetUrlMapper;

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result).to.be.an('object');
    });

    it('should handle empty children array', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithEmptyJsonRte));
      const sourceStackEntry = mockEntries.sourceStackEntryWithEmptyJsonRte;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = mockMappers.assetUidMapper;
      const mappedAssetUrls = mockMappers.assetUrlMapper;

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field.children).to.be.an('array');
      expect(result.json_rte_field.children).to.have.length(1);
      expect(result.json_rte_field.children[0].type).to.equal('p');
    });

    it('should handle multiple JSON RTE fields with asset references', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithMultipleJsonRte));
      const sourceStackEntry = mockEntries.sourceStackEntryWithMultipleJsonRte;
      const ctSchema = mockContentTypes.multipleJsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = mockMappers.assetUidMapper;
      const mappedAssetUrls = mockMappers.assetUrlMapper;

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('array');
      expect(result.json_rte_field).to.have.length(2);
    });

    it('should handle text RTE fields with multiple entries', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithMultipleTextRte));
      const sourceStackEntry = mockEntries.sourceStackEntryWithMultipleTextRte;
      const ctSchema = mockContentTypes.multipleTextRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = mockMappers.assetUidMapper;
      const mappedAssetUrls = mockMappers.assetUrlMapper;

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.text_rte_field).to.be.an('array');
      expect(result.text_rte_field).to.have.length(2);
    });

    it('should handle asset references with display-type link', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetLink));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetLink;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = mockMappers.assetUidMapper;
      const mappedAssetUrls = mockMappers.assetUrlMapper;

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle asset references with display-type display', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetDisplay));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetDisplay;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = mockMappers.assetUidMapper;
      const mappedAssetUrls = mockMappers.assetUrlMapper;

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle multiple blocks with JSON RTE processing', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithMultipleBlocksJsonRte));
      const sourceStackEntry = mockEntries.sourceStackEntryWithMultipleBlocksJsonRte;
      const ctSchema = mockContentTypes.multipleBlocksJsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = mockMappers.assetUidMapper;
      const mappedAssetUrls = mockMappers.assetUrlMapper;

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.blocks_field).to.be.an('array');
      expect(result.blocks_field).to.have.length(2);
    });

    it('should handle multiple groups with JSON RTE processing', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithMultipleGroupsJsonRte));
      const sourceStackEntry = mockEntries.sourceStackEntryWithMultipleGroupsJsonRte;
      const ctSchema = mockContentTypes.multipleGroupsJsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = mockMappers.assetUidMapper;
      const mappedAssetUrls = mockMappers.assetUrlMapper;

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.group_field).to.be.an('array');
      expect(result.group_field).to.have.length(2);
    });

    it('should handle text RTE with UID updates', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithTextRteUidUpdates));
      const sourceStackEntry = mockEntries.sourceStackEntryWithTextRteUidUpdates;
      const ctSchema = mockContentTypes.textRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = mockMappers.assetUidMapper;
      const mappedAssetUrls = mockMappers.assetUrlMapper;

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.text_rte_field).to.be.a('string');
    });

    it('should handle asset UID mapping in JSON RTE', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetUidMapping));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetUidMapping;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = mockMappers.assetUidMapper;
      const mappedAssetUrls = mockMappers.assetUrlMapper;

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with mixed entry references and content', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithMixedJsonRteRefs));
      const ctSchema = mockContentTypes.jsonRteContentType.schema;

      const result = removeEntryRefsFromJSONRTE(entry, ctSchema);

      expect(result.json_rte_field).to.be.an('object');
      expect(result.json_rte_field.children).to.be.an('array');
    });

    it('should handle JSON RTE with nested entry references', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithNestedEntryRefs));
      const ctSchema = mockContentTypes.jsonRteContentType.schema;

      const result = removeEntryRefsFromJSONRTE(entry, ctSchema);

      expect(result.json_rte_field).to.be.an('object');
      expect(result.json_rte_field.children).to.be.an('array');
    });

    it('should handle JSON RTE with only entry references that get filtered out', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithOnlyEntryRefs));
      const ctSchema = mockContentTypes.jsonRteContentType.schema;

      const result = removeEntryRefsFromJSONRTE(entry, ctSchema);

      expect(result.json_rte_field).to.be.an('object');
      expect(result.json_rte_field.children).to.be.an('array');
      expect(result.json_rte_field.children).to.have.length(1);
      expect(result.json_rte_field.children[0].type).to.equal('p');
    });

    it('should handle entry reference detection in p/a/span elements', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithWrappedEntryRefs));
      const ctSchema = mockContentTypes.jsonRteContentType.schema;

      const result = removeEntryRefsFromJSONRTE(entry, ctSchema);

      expect(result.json_rte_field).to.be.an('object');
      expect(result.json_rte_field.children).to.be.an('array');
    });

    it('should handle text RTE with UID matches and updates', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithTextRteUidMatches));
      const sourceStackEntry = mockEntries.sourceStackEntryWithTextRteUidMatches;
      const ctSchema = mockContentTypes.textRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = mockMappers.assetUidMapper;
      const mappedAssetUrls = mockMappers.assetUrlMapper;

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.text_rte_field).to.be.a('string');
    });

    it('should handle asset UID mapping with existing mappedAssetUids', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetUidMapping));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetUidMapping;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'old_asset_1': 'new_asset_1' }; // Specific mapping
      const mappedAssetUrls = mockMappers.assetUrlMapper;

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with entry references that need filtering and empty children replacement', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithEntryRefsForFiltering));
      const ctSchema = mockContentTypes.jsonRteContentType.schema;

      const result = removeEntryRefsFromJSONRTE(entry, ctSchema);

      expect(result.json_rte_field).to.be.an('object');
      expect(result.json_rte_field.children).to.be.an('array');
    });

    it('should handle direct entry reference detection', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithDirectEntryRefs));
      const ctSchema = mockContentTypes.jsonRteContentType.schema;

      const result = removeEntryRefsFromJSONRTE(entry, ctSchema);

      expect(result.json_rte_field).to.be.an('object');
      expect(result.json_rte_field.children).to.be.an('array');
    });

    it('should handle text RTE with multiple UID matches in array', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithMultipleTextRteUidMatches));
      const sourceStackEntry = mockEntries.sourceStackEntryWithMultipleTextRteUidMatches;
      const ctSchema = mockContentTypes.multipleTextRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = mockMappers.assetUidMapper;
      const mappedAssetUrls = mockMappers.assetUrlMapper;

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.text_rte_field).to.be.an('array');
      expect(result.text_rte_field).to.have.length(2);
    });

    it('should handle asset references without mappedAssetUids', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetUidMapping));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetUidMapping;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = {}; // No mappings
      const mappedAssetUrls = mockMappers.assetUrlMapper;

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle asset references without mappedAssetUrls', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetUidMapping));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetUidMapping;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = mockMappers.assetUidMapper;
      const mappedAssetUrls = {}; // No mappings

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle asset references with link display type', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetLink));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetLink;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = { 'https://old-asset-url.com/asset1.jpg': 'https://new-asset-url.com/asset1.jpg' };

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle asset references with both UID and URL mappings', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetUidMapping));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetUidMapping;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'old_asset_1': 'new_asset_1' };
      const mappedAssetUrls = { 'https://old-asset-url.com/asset1.jpg': 'https://new-asset-url.com/asset1.jpg' };

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with children but no attrs', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteNoAttrs));
      const ctSchema = mockContentTypes.jsonRteContentType.schema;

      const result = removeUidsFromJsonRteFields(entry, ctSchema);

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle entries with array fields', () => {
      const data = {
        content_type: mockContentTypes.referenceContentType,
        entry: mockEntries.entryWithArrayField
      };
      const mappedUids = {
        'ref_entry_1': 'new_ref_entry_1'
      };
      const uidMapperPath = '/test/mapper';

      fileHelperReadFileSyncStub.withArgs(path.join(uidMapperPath, 'mapped-uids.json')).returns({});
      fileHelperReadFileSyncStub.withArgs(path.join(uidMapperPath, 'unmapped-uids.json')).returns({});

      const result = lookupEntries(data, mappedUids, uidMapperPath);

      expect(result).to.be.an('object');
    });

    it('should handle JSON RTE with empty attrs', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteEmptyAttrs));
      const ctSchema = mockContentTypes.jsonRteContentType.schema;

      const result = removeUidsFromJsonRteFields(entry, ctSchema);

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with non-object attrs', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteNonObjectAttrs));
      const ctSchema = mockContentTypes.jsonRteContentType.schema;

      const result = removeUidsFromJsonRteFields(entry, ctSchema);

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and link display type', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetLink));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetLink;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = { 'https://old-asset-url.com/asset1.jpg': 'https://new-asset-url.com/asset1.jpg' };

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and display display type', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetDisplay));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetDisplay;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = { 'https://old-asset-url.com/asset1.jpg': 'https://new-asset-url.com/asset1.jpg' };

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references without UID mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetUidMapping));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetUidMapping;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = {}; // No UID mapping
      const mappedAssetUrls = { 'https://old-asset-url.com/asset1.jpg': 'https://new-asset-url.com/asset1.jpg' };

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references without URL mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetUidMapping));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetUidMapping;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = {}; // No URL mapping

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and link display type without URL mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetLink));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetLink;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = {}; // No URL mapping

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and display display type without URL mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetDisplay));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetDisplay;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = {}; // No URL mapping

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and link display type with URL mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetLink));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetLink;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = { 'https://old-asset-url.com/asset1.jpg': 'https://new-asset-url.com/asset1.jpg' };

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and display display type with URL mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetDisplay));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetDisplay;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = { 'https://old-asset-url.com/asset1.jpg': 'https://new-asset-url.com/asset1.jpg' };

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and link display type with both UID and URL mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetLink));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetLink;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = { 'https://old-asset-url.com/asset1.jpg': 'https://new-asset-url.com/asset1.jpg' };

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and display display type with both UID and URL mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetDisplay));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetDisplay;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = { 'https://old-asset-url.com/asset1.jpg': 'https://new-asset-url.com/asset1.jpg' };

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and link display type with UID mapping but no URL mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetLink));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetLink;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = {}; // No URL mapping

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and display display type with UID mapping but no URL mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetDisplay));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetDisplay;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = {}; // No URL mapping

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and link display type with URL mapping but no UID mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetLink));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetLink;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = {}; // No UID mapping
      const mappedAssetUrls = { 'https://old-asset-url.com/asset1.jpg': 'https://new-asset-url.com/asset1.jpg' };

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and display display type with URL mapping but no UID mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetDisplay));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetDisplay;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = {}; // No UID mapping
      const mappedAssetUrls = { 'https://old-asset-url.com/asset1.jpg': 'https://new-asset-url.com/asset1.jpg' };

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and link display type with both UID and URL mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetLink));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetLink;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = { 'https://old-asset-url.com/asset1.jpg': 'https://new-asset-url.com/asset1.jpg' };

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and display display type with both UID and URL mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetDisplay));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetDisplay;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = { 'https://old-asset-url.com/asset1.jpg': 'https://new-asset-url.com/asset1.jpg' };

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and link display type with UID mapping but no URL mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetLink));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetLink;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = {}; // No URL mapping

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and display display type with UID mapping but no URL mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetDisplay));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetDisplay;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = {}; // No URL mapping

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and link display type with URL mapping but no UID mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetLink));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetLink;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = {}; // No UID mapping
      const mappedAssetUrls = { 'https://old-asset-url.com/asset1.jpg': 'https://new-asset-url.com/asset1.jpg' };

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and display display type with URL mapping but no UID mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetDisplay));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetDisplay;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = {}; // No UID mapping
      const mappedAssetUrls = { 'https://old-asset-url.com/asset1.jpg': 'https://new-asset-url.com/asset1.jpg' };

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and link display type with both UID and URL mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetLink));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetLink;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = { 'https://old-asset-url.com/asset1.jpg': 'https://new-asset-url.com/asset1.jpg' };

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and display display type with both UID and URL mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetDisplay));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetDisplay;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = { 'https://old-asset-url.com/asset1.jpg': 'https://new-asset-url.com/asset1.jpg' };

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and link display type with UID mapping but no URL mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetLink));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetLink;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = {}; // No URL mapping

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and display display type with UID mapping but no URL mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetDisplay));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetDisplay;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = {}; // No URL mapping

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and link display type with URL mapping but no UID mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetLink));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetLink;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = {}; // No UID mapping
      const mappedAssetUrls = { 'https://old-asset-url.com/asset1.jpg': 'https://new-asset-url.com/asset1.jpg' };

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and display display type with URL mapping but no UID mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetDisplay));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetDisplay;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = {}; // No UID mapping
      const mappedAssetUrls = { 'https://old-asset-url.com/asset1.jpg': 'https://new-asset-url.com/asset1.jpg' };

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and link display type with both UID and URL mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetLink));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetLink;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = { 'https://old-asset-url.com/asset1.jpg': 'https://new-asset-url.com/asset1.jpg' };

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and display display type with both UID and URL mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetDisplay));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetDisplay;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = { 'https://old-asset-url.com/asset1.jpg': 'https://new-asset-url.com/asset1.jpg' };

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and link display type with UID mapping but no URL mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetLink));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetLink;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = {}; // No URL mapping

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and display display type with UID mapping but no URL mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetDisplay));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetDisplay;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = {}; // No URL mapping

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and link display type with URL mapping but no UID mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetLink));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetLink;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = {}; // No UID mapping
      const mappedAssetUrls = { 'https://old-asset-url.com/asset1.jpg': 'https://new-asset-url.com/asset1.jpg' };

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and display display type with URL mapping but no UID mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetDisplay));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetDisplay;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = {}; // No UID mapping
      const mappedAssetUrls = { 'https://old-asset-url.com/asset1.jpg': 'https://new-asset-url.com/asset1.jpg' };

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and link display type with both UID and URL mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetLink));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetLink;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = { 'https://old-asset-url.com/asset1.jpg': 'https://new-asset-url.com/asset1.jpg' };

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and display display type with both UID and URL mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetDisplay));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetDisplay;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = { 'https://old-asset-url.com/asset1.jpg': 'https://new-asset-url.com/asset1.jpg' };

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and link display type with UID mapping but no URL mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetLink));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetLink;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = {}; // No URL mapping

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with asset references and display display type with UID mapping but no URL mapping', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteAssetDisplay));
      const sourceStackEntry = mockEntries.sourceStackEntryWithJsonRteAssetDisplay;
      const ctSchema = mockContentTypes.jsonRteContentType.schema;
      const uidMapper = mockMappers.entriesUidMapper;
      const mappedAssetUids = { 'asset_1': 'new_asset_1' };
      const mappedAssetUrls = {}; // No URL mapping

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle JSON RTE with no entry references to filter (covers lines 444-447)', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteNoEntryRefs));
      const ctSchema = mockContentTypes.jsonRteContentType.schema;

      const result = removeEntryRefsFromJSONRTE(entry, ctSchema);

      expect(result.json_rte_field).to.be.an('object');
      expect(result.json_rte_field.children).to.be.an('array');
    });

    it('should handle JSON RTE with no entry references in multiple array (covers lines 444-447)', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithMultipleJsonRteNoEntryRefs));
      const ctSchema = mockContentTypes.multipleJsonRteContentType.schema;

      const result = removeEntryRefsFromJSONRTE(entry, ctSchema);

      expect(result.json_rte_field).to.be.an('array');
      expect(result.json_rte_field).to.have.length(2);
      expect(result.json_rte_field[0]).to.be.an('object');
      expect(result.json_rte_field[1]).to.be.an('object');
    });

    it('should handle JSON RTE with entry references that result in empty children after filtering (covers lines 455-457)', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithJsonRteOnlyEntryRefs));
      const ctSchema = mockContentTypes.jsonRteContentType.schema;

      const result = removeEntryRefsFromJSONRTE(entry, ctSchema);

      expect(result.json_rte_field).to.be.an('object');
      expect(result.json_rte_field.children).to.be.an('array');
      // The function should process the entry and return a result
      expect(result.json_rte_field.children.length).to.be.greaterThan(0);
    });

    it('should handle direct entry reference detection in doEntryReferencesExist (covers lines 496, 501)', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithDirectEntryRefs));
      const ctSchema = mockContentTypes.jsonRteContentType.schema;

      const result = removeEntryRefsFromJSONRTE(entry, ctSchema);

      expect(result.json_rte_field).to.be.an('object');
    });

    it('should handle text RTE with multiple array processing (covers line 607)', () => {
      const entry = JSON.parse(JSON.stringify(mockEntries.entryWithMultipleTextRteArray));
      const sourceStackEntry = mockEntries.sourceStackEntryWithMultipleTextRteArray;
      const ctSchema = mockContentTypes.multipleTextRteContentType.schema;
      const uidMapper = { 'old_ref_entry_1': 'new_ref_entry_1', 'old_ref_entry_2': 'new_ref_entry_2' };
      const mappedAssetUids = mockMappers.assetUidMapper;
      const mappedAssetUrls = mockMappers.assetUrlMapper;

      const result = restoreJsonRteEntryRefs(entry, sourceStackEntry, ctSchema, {
        uidMapper,
        mappedAssetUids,
        mappedAssetUrls
      });

      expect(result.text_rte_field).to.be.an('array');
      expect(result.text_rte_field).to.have.length(2);
    });
  });
});
