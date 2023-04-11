const mockData = {
  flags : {
   baseBranch: 'main',
   compareBranch: 'dev',
   stackAPIKey: "sfgfdsg223",
   module: "content_types",
   authToken: "sqerqw2454",
   format: "text"
 },
  data:{
   base: 'main',
   compare: 'dev',
   base_only: 0,
   compare_only: 0,
   modified: 0
 },
 branchDiff:{
   "branches": {
     "base_branch": "main",
     "compare_branch": "dev"
   },
   "diff": [ 
     {
       "uid": "content_type_uid_1", 
       "title": "Content Type 1 Title", 
       "type": "content_type", 
       "status": "compare_only" 
     },
     {
       "uid": "content_type_uid_2", 
       "title": "Content Type 2 Title", 
       "type": "content_type", 
       "status": "modified" 
     }
   ]
 },
 branchDiffData:[ 
  {
    "uid": "content_type_uid_1", 
    "title": "Content Type 1 Title", 
    "type": "content_type", 
    "status": "compare_only" 
  },
  {
    "uid": "content_type_uid_2", 
    "title": "Content Type 2 Title", 
    "type": "content_type", 
    "status": "modified" 
  }
],
 branchSummary:{
  base: "main",
  compare: "dev",
  base_only: 0,
  compare_only:1,
  modified:1,
 },
 branchCompactData:{
  modified:[{
    uid: "content_type1",
    title: "Content Type1",
    type: "content_type",
    status: "modified",
  }],
  added:[{
    uid: "content_type2",
    title: "Content Type 2",
    type: "content_type",
    status: "compare_only",
  }],
  deleted:[
    {
      uid: "content_type3",
      title: "Content Type 3",
      type: "content_type",
      status: "base_only",
    }
  ]
 },
 branchDiffPayload:{
  module: "content_types",
  apiKey: "afdgaffsdg",
  baseBranch: "main",
  compareBranch:"dev"
 },
 verboseRes : {
  modified: [
    {
      moduleDetails: {
        uid: "content_type1",
        title: "Content Type1",
        type: "content_type",
        status: "modified",
      },
      modifiedFields: {
        modified: [],
        deleted: [],
        added: [],
      },
    }
  ],
  added: [
    {
      uid: "content_type2",
      title: "Content Type 2",
      type: "content_type",
      status: "compare_only",
    }
  ],
  deleted: [],
},
emptyVerboseRes : {
  modified: [],
  added: [],
  deleted: [],
}
};

export { mockData };
