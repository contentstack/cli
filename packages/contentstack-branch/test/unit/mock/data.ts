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
 }
};

export { mockData };
