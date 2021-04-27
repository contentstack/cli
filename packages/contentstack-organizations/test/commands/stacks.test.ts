import Organization from '../../src/commands/cm/stacks';
import {expect, test} from '@oclif/test'

import * as mockOrgs from '../mockData/mock-organizations.json'
import * as mockStacks from '../mockData/mock-stacks.json'

describe('testing organizations command', () => {
	test
	.stub(Organization.prototype, 'managementAPIClient', () => {
		return {
			organization: function() {
				return {
					fetchAll: function() {
						return Promise.resolve(mockOrgs)
					}
				}
			},
			stack: function() {
				return {
					query: function() {
						return {
							find: function() {
								return Promise.resolve(mockStacks)
							}
						}
					}
				}
			}
		}
	})
	.stdout()
	.command(['cm:stacks'])
	.it('displays a list of stacks', ctx => {
	})

	test
	.stub(Organization.prototype, 'managementAPIClient', () => {
		return {
			organization: function() {
				return {
					fetchAll: function() {
						return Promise.resolve(mockOrgs)
					}
				}
			},
			stack: function() {
				return {
					query: function() {
						return {
							find: function() {
								return Promise.resolve(mockStacks)
							}
						}
					}
				}
			}
		}
	})
	.stdout()
	.command(['cm:stacks', '--output=json'])
	.it('displays a list of organizations', ctx => {
		debugger
		expect(JSON.parse(ctx.stdout)).to.be.an('array')
	})

	test
	.stub(Organization.prototype, 'managementAPIClient', () => {
		return {
			organization: function() {
				return {
					fetchAll: function() {
						return Promise.resolve(mockOrgs)
					}
				}
			},
			stack: function() {
				return {
					query: function() {
						return {
							find: function() {
								return Promise.resolve(mockStacks)
							}
						}
					}
				}
			}
		}
	})
	.stdout()
	.command(['cm:stacks', '--csv'])
	.it('displays a list of organizations', ctx => {
		// expect(JSON.parse(ctx.stdout)).to.be.an('array')
	})

	test
	.stub(Organization.prototype, 'managementAPIClient', () => {
		return {
			organization: function() {
				return {
					fetchAll: function() {
						return Promise.resolve(mockOrgs)
					}
				}
			},
			stack: function() {
				return {
					query: function() {
						return {
							find: function() {
								return Promise.resolve(mockStacks)
							}
						}
					}
				}
			}
		}
	})
	.stdout()
	.command(['cm:stacks', '--sort=name'])
	.it('displays a list of organizations', ctx => {
		// expect(JSON.parse(ctx.stdout)).to.be.an('array')
	})

	test
	.stub(Organization.prototype, 'managementAPIClient', () => {
		return {
			organization: function() {
				return {
					fetchAll: function() {
						return Promise.resolve(mockOrgs)
					}
				}
			},
			stack: function() {
				return {
					query: function() {
						return {
							find: function() {
								return Promise.resolve(mockStacks)
							}
						}
					}
				}
			}
		}
	})
	.stdout()
	.command(['cm:stacks', '--sort=-name'])
	.it('displays a list of organizations', ctx => {
		// expect(JSON.parse(ctx.stdout)).to.be.an('array')
	})

	test
	.stub(Organization.prototype, 'managementAPIClient', () => {
		return {
			organization: function() {
				return {
					fetchAll: function() {
						return Promise.resolve(mockOrgs)
					}
				}
			},
			stack: function() {
				return {
					query: function() {
						return {
							find: function() {
								return Promise.resolve(mockStacks)
							}
						}
					}
				}
			}
		}
	})
	.stdout()
	.command(['cm:stacks', '--sort=-name'])
	.it('displays a list of organizations', ctx => {
		// expect(JSON.parse(ctx.stdout)).to.be.an('array')
	})

	test
	.stub(Organization.prototype, 'managementAPIClient', () => {
		return {
			organization: function() {
				return {
					fetchAll: function() {
						return Promise.resolve(mockOrgs)
					}
				}
			},
			stack: function() {
				return {
					query: function() {
						return {
							find: function() {
								return Promise.resolve(mockStacks)
							}
						}
					}
				}
			}
		}
	})
	.stdout()
	.command(['cm:stacks', '--sort=whatever'])
	.it('displays a list of organizations', ctx => {
		// expect(JSON.parse(ctx.stdout)).to.be.an('array')
	})

	test
	.stub(Organization.prototype, 'managementAPIClient', () => {
		return {
			organization: function() {
				return {
					fetchAll: function() {
						return Promise.resolve(mockOrgs)
					}
				}
			},
			stack: function() {
				return {
					query: function() {
						return {
							find: function() {
								return Promise.resolve(mockStacks)
							}
						}
					}
				}
			}
		}
	})
	.stdout()
	.command(['cm:stacks', '--orgUid=mockOrg1'])
	.it('displays a list of organizations', ctx => {
		// expect(JSON.parse(ctx.stdout)).to.be.an('array')
	})

	test
	.stub(Organization.prototype, 'managementAPIClient', () => {
		return {
			organization: function() {
				return {
					fetchAll: function() {
						return Promise.resolve(mockOrgs)
					}
				}
			},
			stack: function() {
				return {
					query: function() {
						return {
							find: function() {
								return Promise.resolve(mockStacks)
							}
						}
					}
				}
			}
		}
	})
	.stdout()
	.command(['cm:stacks', '--orgUid=whatever'])
	.it('displays a list of organizations', ctx => {
		// expect(JSON.parse(ctx.stdout)).to.be.an('array')
	})

	test
	.stub(Organization.prototype, 'managementAPIClient', () => {
		return {
			organization: function() {
				return {
					fetchAll: function() {
						return Promise.resolve(mockOrgs)
					}
				}
			},
			stack: function() {
				return {
					query: function() {
						return {
							find: function() {
								return Promise.resolve(mockStacks)
							}
						}
					}
				}
			}
		}
	})
	.stdout()
	.command(['cm:stacks', '--columns=whatever'])
	.it('displays a list of organizations', ctx => {
		// expect(JSON.parse(ctx.stdout)).to.be.an('array')
	})

	test
	.stub(Organization.prototype, 'managementAPIClient', () => {
		return {
			organization: function() {
				return {
					fetchAll: function() {
						return Promise.resolve(mockOrgs)
					}
				}
			},
			stack: function() {
				return {
					query: function() {
						return {
							find: function() {
								return Promise.resolve(mockStacks)
							}
						}
					}
				}
			}
		}
	})
	.stdout()
	.command(['cm:stacks', '--columns=name,uid'])
	.it('displays a list of organizations', ctx => {
		// expect(JSON.parse(ctx.stdout)).to.be.an('array')
	})
})