'use strict';

// Utils
const { constants } = require('../utils');
// Properties
const { actions, validationAction } = constants;
const {
  create,
  customTask,
  edit,
  transformEntries,
  deriveLinkedEntries,
  transformEntriesToType,
  typeError,
  apiError,
  schema,
  __migrationError,
  field,
} = validationAction;

const actionCreators = {
  customTasks: (callsite, opts) => {
    const { CUSTOM_TASK } = actions;
    return {
      type: customTask,
      meta: {
        callsite: {
          file: callsite.getFileName(),
          line: callsite.getLineNumber(),
        },
      },
      payload: {
        options: opts,
        action: CUSTOM_TASK,
      },
    };
  },
  contentType: {
    create: (callsite, id, opts) => {
      const { CREATE_CT } = actions;
      return {
        type: create,
        meta: {
          callsite: {
            file: callsite.getFileName(),
            line: callsite.getLineNumber(),
          },
        },
        payload: {
          contentTypeId: id,
          options: opts,
          action: CREATE_CT,
        },
      };
    },
    edit: (callsite, id, opts) => {
      const { EDIT_CT } = actions;

      return {
        type: edit,
        meta: {
          callsite: {
            file: callsite.getFileName(),
            line: callsite.getLineNumber(),
          },
        },
        payload: {
          contentTypeId: id,
          options: opts,
          action: EDIT_CT,
        },
      };
    },
    // delete: () => { },
    transformEntries: (callsite, id, opts) => {
      return {
        type: transformEntries,
        meta: {
          callsite: {
            file: callsite.getFileName(),
            line: callsite.getLineNumber(),
          },
        },
        payload: {
          options: opts,
        },
      };
    },
    deriveLinkedEntries: (callsite, id, opts) => {
      return {
        type: deriveLinkedEntries,
        meta: {
          callsite: {
            file: callsite.getFileName(),
            line: callsite.getLineNumber(),
          },
        },
        payload: {
          options: opts,
        },
      };
    },
    transformEntriesToType: (callsite, id, opts) => {
      return {
        type: transformEntriesToType,
        meta: {
          callsite: {
            file: callsite.getFileName(),
            line: callsite.getLineNumber(),
          },
        },
        payload: {
          options: opts,
        },
      };
    },
    typeError: (callsite, id, { typeErrors }) => {
      return {
        type: typeError,
        meta: {
          callsite: {
            file: callsite.getFileName(),
            line: callsite.getLineNumber(),
          },
        },
        payload: { typeErrors },
      };
    },
    apiError: (callsite, id, opts) => {
      return {
        type: apiError,
        meta: {
          callsite: {
            file: callsite.getFileName(),
            line: callsite.getLineNumber(),
          },
        },
        payload: { apiError: opts },
      };
    },
    fromFields: (callsite, id, opts) => {
      return {
        type: schema,
        meta: {
          callsite: {
            file: callsite.getFileName(),
            line: callsite.getLineNumber(),
          },
        },
        payload: { fromField: opts.fromField },
      };
    },
    toFields: (callsite, id, opts) => {
      return {
        type: schema,
        meta: {
          callsite: {
            file: callsite.getFileName(),
            line: callsite.getLineNumber(),
          },
        },
        payload: { toField: opts.toField },
      };
    },
    toReferenceFields: (callsite, id, opts) => {
      return {
        type: schema,
        meta: {
          callsite: {
            file: callsite.getFileName(),
            line: callsite.getLineNumber(),
          },
        },
        payload: { toField: opts.toReferenceField },
      };
    },
    deriveFields: (callsite, id, opts) => {
      return {
        type: schema,
        meta: {
          callsite: {
            file: callsite.getFileName(),
            line: callsite.getLineNumber(),
          },
        },
        payload: { deriveField: opts.deriveField },
      };
    },
    migrationError: (callsite, id, opts) => {
      return {
        type: __migrationError,
        meta: {
          callsite: {
            file: callsite.getFileName(),
            line: callsite.getLineNumber(),
          },
        },
        payload: { migrationError: opts },
      };
    },
    field: (callsite, id, opts) => {
      return {
        type: field,
        meta: {
          callsite: {
            file: callsite.getFileName(),
            line: callsite.getLineNumber(),
          },
        },
        payload: { field: opts },
      };
    },
  },
};

exports.actionCreators = actionCreators;
exports.ActionList = require('./action-list');
