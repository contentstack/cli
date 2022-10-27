const { expect, test, it } = require('@oclif/test');
const { cliux } = require('@contentstack/cli-utilities');
const { Client } = require('../../src/lib/util/contentstack-management-sdk');
let defaultConfig = require('../../src/config/default');
let _ = require('lodash');
var environmentsMock = require('../mock/environment');
var extensionsMock = require('../mock/extensions');
var localeMock = require('../mock/locales');
var globalFieldsMock = require('../mock/globalFields');
var webhooksMock = require('../mock/webhook');
var assetsMock = require('../mock/assets');
var assetFetchMock = require('../mock/assetFetch');
var entriesMock = require('../mock/entries');
var entriesFetchMock = require('../mock/entryFetch');
var contentTypeMock = require('../mock/content-types');
let message = require('../../messages/index.json');

let client = Client(defaultConfig);
// console.log("Line no 20+++++", client);

// test
// .stub(require('../../src/lib/util/contentstack-management-sdk'), 'Client', e => {
//   return {
//     stack: function () {
//       return {
// 		users: function () {
// 			return new Promise.resolve()
//         // locale: function () {
//         //   return {
//         //     query: function () {
//         //       return {
//         //         find: function () {
//         //           return Promise.resolve(localeMock)
//         //         },
//         //       }
//         //     },
//         //   }
//         },
//       }
//     },
//   }
// })
// .stub(cli, 'prompt', name => async name => {
// 	if (name === 'Please provide master locale ?') return 'en-us'
// 	if (name === 'Please provide target Stack') return 'newstackUid'
// 	if (name === 'Please provide path were you have stored the data') return '/home/rohit/Import-Export-script/contentstack-export/SYNcontents/'
// })
// .command(['cm:import',  '--auth-token', '-m',  'locales'])
// .it('runs method of Locales', ctx => {
// })

// test
// .stub(require('../../src/lib/util/contentstack-management-sdk'), 'Client', (e) => {
// 	return {
// 		stack: function() {
// 			return {
// 				environment: function() {
// 					return {
// 						query: function() {
// 							return {
// 								find: function() {
// 									return Promise.resolve(environmentsMock)
// 								}
// 							}
// 						}
// 					}
// 				}
// 			}
// 		}
// 	}
// })
// .stub(cli, 'prompt', (name) => async (name) => {
// 	if (name === 'Please provide master locale ?') return 'en-us'
// 	if (name === 'Please provide source Stack') return 'newstackUid'
// 	if (name === 'Please provide path were you want to store') return '../contents'
// })
// .command(['cm:export',  '--auth-token', '-m',  'environments'])
// .it('runs method of environment', ctx => {
// })

// //global-fields
// test
// .stub(require('../../src/lib/util/contentstack-management-sdk'), 'Client', (e) => {
// 	return {
// 		stack: function() {
// 			return {
// 				globalField: function() {
// 					return {
//             create: function() {
//               return Promise.resolve(globalFieldsMock)
//             }
// 					}
// 				}
// 			}
// 		}
// 	}
// })
// .stub(cli, 'prompt', (name) => async (name) => {
// 	if (name === 'Please provide master locale ?') return 'en-us'
// 	if (name === 'Please provide source Stack') return 'newstackUid'
// 	if (name === 'Please provide path were you want to store') return '../contents'
// })
// .command(['cm:export',  '--auth-token', '-m',  'global-fields'])
// .it('runs method of Global Fields', ctx => {
// })

// test
// 	.stub("../../src/lib/util/contentstack-management-sdk", 'stack', (e) => {
// 		return {
// 			users: () => Promise.reject("jjjjjj")
// 		}
// 	})
// 	.stub(cli, 'prompt', (name) => async (name) => {
// 		if (name === 'Please provide master locale ?') return 'en-us'
// 		if (name === 'Please provide target Stack') return 'newstackUid'
// 		if (name === 'Please provide path were you have stored the data') return '/home/rohit/Import-Export-script/contentstack-export/SYNcontents/'
// 	})
// 	.command(['cm:import', '-A', '-m', 'locales'])
// 	.it('runs method of Locales', ctx => {
// 		// console.log(ctx);
// 	})

test
  .stub(require('../../src/lib/util/contentstack-management-sdk'), 'Client', (e) => {
    return {
      stack: function () {
        return {
          locale: function () {
            return {
              create: function () {
                return new Promise.resolve('ncjkdncjdncjd');
              },
            };
          },
        };
      },
      users: function () {
        return new Promise.resolve();
      },
    };
  })
  .stub(cliux, 'prompt', (_name) => async (name) => {
    if (name === 'Please provide master locale ?') return 'en-us';
    if (name === 'Please provide target Stack') return 'newstackUid';
    if (name === 'Please provide path were you have stored the data')
      return '/home/rohit/Import-Export-script/contentstack-export/SYNcontents/';
  })
  .command(['cm:import', '--auth-token', '-m', 'locales'])
  .it('runs method of Locales', (ctx) => {});

// test
// .stub(require('../../src/lib/util/contentstack-management-sdk'), 'Client', (e) => {
// 	return {
// 		stack: function() {
// 			return {
// 				extension: function() {
//           return {
//             create: function() {
//               return Promise.resolve(localeMock)
//           }
//           }
// 				}
// 			}
// 		}
// 	}
// })
// .stub(cli, 'prompt', (name) => async (name) => {
// 	if (name === 'Please provide master locale ?') return 'en-us'
// 	if (name === 'Please provide source Stack') return 'newstackUid'
// 	if (name === 'Please provide path were you want to store') return '../contents'
// })
// .command(['cm:import',  '--auth-token', '-m',  'extensions'])
// .it('runs method of environment', ctx => {
// })

// test
// .stub(require('../../src/lib/util/contentstack-management-sdk'), 'Client', (e) => {
// 	return {
// 		stack: function() {
// 			return {
// 				webhook: function() {
// 							return {
// 								create: function() {
// 									return Promise.resolve(webhooksMock)
// 								}
// 							}
// 					}
// 				}
// 			}
// 		}
// })
// .stub(cli, 'prompt', (name) => async (name) => {
// 	if (name === 'Please provide master locale ?') return 'en-us'
// 	if (name === 'Please provide source Stack') return 'newstackUid'
// 	if (name === 'Please provide path were you want to store') return '../contents'
// })
// .command(['cm:import',  '--auth-token', '-m',  'webhooks'])
// .it('runs method of webooks', ctx => {
// })

// test
// .stub(require('../../src/lib/util/contentstack-management-sdk'), 'Client', (e) => {
// 	return {
// 		stack: function() {
// 			return {
// 				asset: function() {
// 					return {
// 						folder: function() {
// 							return {
// 								create: function() {
// 									return Promise.resolve(assetsMock)
// 								}
// 							}
//             },
//             create: function() {
//               return Promise.resolve(assetResponse)
//             }
// 					}
// 				}
// 			}
// 		}
// 	}
// })
// .stub(cli, 'prompt', (name) => async (name) => {
// 	if (name === 'Please provide master locale ?') return 'en-us'
// 	if (name === 'Please provide source Stack') return 'newstackUid'
// 	if (name === 'Please provide path were you want to store') return '../contents'
// })
// .command(['cm:import',  '--auth-token', '-m',  'assets'])
// .it('runs method of Assets', ctx => {
// })

// // test
// // .stub(require('../../src/lib/util/contentstack-management-sdk'), 'Client', (e) => {
// // 	return {
// // 		stack: function() {
// // 			return {
// // 				asset: function() {
// // 					return {
// // 						query: function() {
// // 							return {
// // 								find: function() {
// // 									return Promise.reject()
// // 								}
// // 							}
// // 						},
// // 						fetch: function() {
// // 							return Promise.reject()
// // 						}
// // 					}
// // 				}
// // 			}
// // 		}
// // 	}
// // })
// // .stub(cli, 'prompt', (name) => async (name) => {
// // 	if (name === 'Please provide master locale ?') return 'en-us'
// // 	if (name === 'Please provide source Stack') return 'newstackUid'
// // 	if (name === 'Please provide path were you want to store') return '../contentsTest'
// // })
// // .command(['cm:export',  '--auth-token', '-m',  'assets'])
// // .it('runs method of Assets for rejection', ctx => {
// // })

// test
// .stub(require('../../src/lib/util/contentstack-management-sdk'), 'Client', (e) => {
// 	return {
// 		stack: function() {
// 			return {
// 				contentType: function() {
// 					return {
// 						create: function() {
// 						    return Promise.resolve(contentTypeMock)
// 						},
// 						fetch: function() {
// 							return Promise.resolve(contentTypeFetch)
// 						}
// 					}
// 				}
// 			}
// 		}
// 	}
// })
// .stub(cli, 'prompt', (name) => async (name) => {
// 	if (name === 'Please provide master locale ?') return 'en-us'
// 	if (name === 'Please provide source Stack') return 'newstackUid'
// 	if (name === 'Please provide path were you want to store') return '../contents'
// })
// .command(['cm:import',  '--auth-token', '-m',  'content-types'])
// .it('runs method of ContentTypes', ctx => {
// })

// test
// .stub(require('../../src/lib/util/contentstack-management-sdk'), 'Client', (e) => {
// 	return {
// 		stack: function() {
// 			return {
// 				contentType: function() {
// 					return {
// 						entry: function() {
// 							return {
// 								create: function() {
// 									return Promise.resolve(entriesFetchMock)
// 								},
// 								fetch: function() {
// 									return Promise.resolve(entriesFetchMock)
// 								}
// 							}
// 						},
// 						fetch: function() {
// 							return Promise.resolve(contentTypesSchema)
// 						},
// 						publish: function() {
// 							return Promise.resolve()
// 						}
// 					}
// 				}
// 			}
// 		}
// 	}
// })
// .stub(cli, 'prompt', (name) => async (name) => {
// 	if (name === 'Please provide master locale ?') return 'en-us'
// 	if (name === 'Please provide source Stack') return 'newstackUid'
// 	if (name === 'Please provide path were you want to store') return '../contents'
// })
// .command(['cm:import',  '--auth-token', '-m',  'entries'])
// .it('runs method of environment', ctx => {
// })

// test
// .stub(require('../../src/lib/util/contentstack-management-sdk'), 'Client', (e) => {
// 	return {
// 		stack: function() {
// 			return {
// 				asset: function() {
// 					// return {
// 					// 	query: function() {
// 							return {
// 								fetch: function() {
// 									return Promise.resolve(assetFetchMock)
// 								}
// 							}
// 						//}
// 					//}
// 				}
// 			}
// 		}
// 	}
// })
// .stub(cli, 'prompt', (name) => async (name) => {
// 	if (name === 'Please provide master locale ?') return 'en-us'
// 	if (name === 'Please provide source Stack') return 'newstackUid'
// 	if (name === 'Please provide path were you want to store') return '../contents'
// })
// .command(['cm:export',  '--auth-token', '-m',  'assets'])
// .it('runs method of webooks', ctx => {
// })
