// Utils
import { constants } from '../utils';
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

export const actionCreators = {
  customTasks: (callsite: any, opts: any) => {
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
    create: (callsite: any, id: string, opts: any) => {
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
    edit: (callsite: any, id: string, opts: any) => {
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
    transformEntries: (callsite: any, id: string, opts: any) => {
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
    deriveLinkedEntries: (callsite: any, id: string, opts: any) => {
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
    transformEntriesToType: (callsite: any, id: string, opts: any) => {
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
    typeError: (callsite: any, id: string, { typeErrors }: { typeErrors: any }) => {
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
    apiError: (callsite: any, id: string, opts: any) => {
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
    fromFields: (callsite: any, id: string, opts: any) => {
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
    toFields: (callsite: any, id: string, opts: any) => {
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
    toReferenceFields: (callsite: any, id: string, opts: any) => {
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
    deriveFields: (callsite: any, id: string, opts: any) => {
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
    migrationError: (callsite: any, id: string, opts: any) => {
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
    field: (callsite: any, id: string, opts: any) => {
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

export { default as ActionList } from './action-list';
