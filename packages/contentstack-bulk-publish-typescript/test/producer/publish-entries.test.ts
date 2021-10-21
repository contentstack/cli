// get entries - fetch all entries successfully
// get entries - handle error while fetching entries
// get content types - fetch all content types successfully
// get content types - handle errors while fetching content types
import mocha from 'mocha'
import {expect} from 'chai'
import {
  start, getContentTypes, getEntries, setConfig
} from '../../src/producer/publish-entries'
import nock from 'nock'

import * as dummyConfig from '../dummy/config';
import * as bulkentriesResponse1 from '../dummy/bulkentries1';
import * as bulkentriesResponse2 from '../dummy/bulkentries2';
import * as entryPublishResponse from '../dummy/entrypublished';
import * as contentTypesResponse from '../dummy/bulkContentTypeResponse';

const bulkPublishEntriesLog = '1587758242717.bulkPublishEntries.error';

describe('testing publish entries', () => {

  beforeEach();
  afterEach();

  it('should fetch all entries successfully', sinon.test(function() {

  }))
  it('handle errors when fetching entries', () => { })
  it('fetch all content types successfully', () => { })
  it('should fetch all entries successfully', () => { })
  it('should fetch all entries successfully', () => { })
})
