const os = require('os');
const fs = require('fs');
const mkdirp = require('mkdirp');
const find = require('lodash/find');
const cloneDeep = require('lodash/cloneDeep');
const omit = require('lodash/omit');
const flat = require('lodash/flatten');
const fastcsv = require('fast-csv');
const inquirer = require('inquirer');
const debug = require('debug')('export-to-csv');
const checkboxPlus = require('inquirer-checkbox-plus-prompt');
const config = require('./config.js');
const {
  cliux,
  configHandler,
  HttpClient,
  messageHandler,
  managementSDKClient,
  ContentstackClient,
} = require('@contentstack/cli-utilities');

const directory = './data';
const delimeter = os.platform() === 'win32' ? '\\' : '/';

// Register checkbox-plus here.
inquirer.registerPrompt('checkbox-plus', checkboxPlus);

function chooseOrganization(managementAPIClient, action) {
  return new Promise(async (resolve, reject) => {
    try {
      let organizations;
      if (action === config.exportUsers || action === config.exportTeams || action === 'teams') {
        organizations = await getOrganizationsWhereUserIsAdmin(managementAPIClient);
      } else {
        organizations = await getOrganizations(managementAPIClient);
      }
      let orgList = Object.keys(organizations);
      orgList.push(config.cancelString);
      let _chooseOrganization = [
        {
          type: 'list',
          name: 'chosenOrg',
          message: 'Choose an Organization',
          choices: orgList,
          loop: false,
        },
      ];
      inquirer
        .prompt(_chooseOrganization)
        .then(({ chosenOrg }) => {
          if (chosenOrg === config.cancelString) exitProgram();
          resolve({ name: chosenOrg, uid: organizations[chosenOrg] });
        })
        .catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}

async function getOrganizations(managementAPIClient) {
  try {
    return await getOrganizationList(managementAPIClient, { skip: 0, page: 1, limit: 100 }, []);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

async function getOrganizationList(managementAPIClient, params, result = []) {
  let organizations;
  const configOrgUid = configHandler.get('oauthOrgUid');

  if (configOrgUid) {
    organizations = await managementAPIClient.organization(configOrgUid).fetch();
    result = result.concat([organizations]);
  } else {
    organizations = await managementAPIClient.organization().fetchAll({ limit: 100 });
    result = result.concat(organizations.items);
  }

  if (!organizations.items || (organizations.items && organizations.items.length < params.limit)) {
    const orgMap = {};
    for (const org of result) {
      orgMap[org.name] = org.uid;
    }
    return orgMap;
  } else {
    params.skip = params.page * params.limit;
    params.page++;
    await wait(200);
    return getOrganizationList(managementAPIClient, params, result);
  }
}

async function getOrganizationsWhereUserIsAdmin(managementAPIClient) {
  try {
    let result = {};
    const configOrgUid = configHandler.get('oauthOrgUid');

    if (configOrgUid) {
      const response = await managementAPIClient.organization(configOrgUid).fetch();
      result[response.name] = response.uid;
    } else {
      const response = await managementAPIClient.getUser({ include_orgs_roles: true });
      const organizations = response.organizations.filter((org) => {
        if (org.org_roles) {
          const org_role = org.org_roles.shift();
          return org_role.admin;
        }
        return org.is_owner === true;
      });

      organizations.forEach((org) => {
        result[org.name] = org.uid;
      });
    }

    return result;
  } catch (error) {
    throw error;
  }
}

function chooseStack(managementAPIClient, orgUid, stackApiKey) {
  return new Promise(async (resolve, reject) => {
    try {
      let stacks = await getStacks(managementAPIClient, orgUid);

      if (stackApiKey) {
        const stackName = Object.keys(stacks).find((key) => stacks[key] === stackApiKey);

        if (stackName) {
          resolve({ name: stackName, apiKey: stackApiKey });
        } else {
          throw new Error('Could not find stack');
        }
        return;
      }

      let stackList = Object.keys(stacks);
      stackList.push(config.cancelString);
      let _chooseStack = [
        {
          type: 'list',
          name: 'chosenStack',
          message: 'Choose a Stack',
          choices: stackList,
        },
      ];

      inquirer
        .prompt(_chooseStack)
        .then(({ chosenStack }) => {
          if (chosenStack === config.cancelString) exitProgram();
          resolve({ name: chosenStack, apiKey: stacks[chosenStack] });
        })
        .catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}

async function chooseBranch(branchList) {
  try {
    const branchesArray = branchList.map((branch) => branch.uid);

    let _chooseBranch = [
      {
        type: 'list',
        name: 'branch',
        message: 'Choose a Branch',
        choices: branchesArray,
      },
    ];
    return await inquirer.prompt(_chooseBranch);
  } catch (err) {
    cliux.error(err);
  }
}

function getStacks(managementAPIClient, orgUid) {
  return new Promise((resolve, reject) => {
    let result = {};
    managementAPIClient
      .stack({ organization_uid: orgUid })
      .query({ query: {} })
      .find()
      .then((stacks) => {
        stacks.items.forEach((stack) => {
          result[stack.name] = stack.api_key;
        });
        resolve(result);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

function chooseContentType(stackAPIClient, skip) {
  return new Promise(async (resolve, reject) => {
    let contentTypes = await getContentTypes(stackAPIClient, skip);
    let contentTypesList = Object.values(contentTypes);
    let _chooseContentType = [
      {
        type: 'checkbox',
        message: 'Choose Content Type (Press Space to select the content types) ',
        choices: contentTypesList,
        name: 'chosenContentTypes',
        loop: false,
      },
    ];

    inquirer
      .prompt(_chooseContentType)
      .then(({ chosenContentTypes }) => resolve(chosenContentTypes))
      .catch(reject);
  });
}

function chooseInMemContentTypes(contentTypesList) {
  return new Promise((resolve, reject) => {
    let _chooseContentType = [
      {
        type: 'checkbox-plus',
        message: 'Choose Content Type (Press Space to select the content types)',
        choices: contentTypesList,
        name: 'chosenContentTypes',
        loop: false,
        highlight: true,
        searchable: true,
        source: (_, input) => {
          input = input || '';
          const inputArray = input.split(' ');
          return new Promise((resolveSource) => {
            const contentTypes = contentTypesList.filter((contentType) => {
              let shouldInclude = true;
              inputArray.forEach((inputChunk) => {
                // if any term to filter by doesn't exist, exclude
                if (!contentType.toLowerCase().includes(inputChunk.toLowerCase())) {
                  shouldInclude = false;
                }
              });
              return shouldInclude;
            });
            resolveSource(contentTypes);
          });
        },
      },
    ];
    inquirer
      .prompt(_chooseContentType)
      .then(({ chosenContentTypes }) => {
        if (chosenContentTypes.length === 0) {
          reject('Please select atleast one content type.');
        }
        resolve(chosenContentTypes);
      })
      .catch(reject);
  });
}

function getContentTypes(stackAPIClient, skip) {
  return new Promise((resolve, reject) => {
    let result = {};
    stackAPIClient
      .contentType()
      .query({ skip: skip * 100, include_branch: true })
      .find()
      .then((contentTypes) => {
        contentTypes.items.forEach((contentType) => {
          result[contentType.title] = contentType.uid;
        });
        resolve(result);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

function chooseLanguage(stackAPIClient) {
  return new Promise(async (resolve, reject) => {
    let languages = await getLanguages(stackAPIClient);
    let languagesList = Object.keys(languages);
    languagesList.push(config.cancelString);

    let _chooseLanguage = [
      {
        type: 'list',
        message: 'Choose Language',
        choices: languagesList,
        name: 'chosenLanguage',
      },
    ];

    inquirer
      .prompt(_chooseLanguage)
      .then(({ chosenLanguage }) => {
        if (chosenLanguage === config.cancelString) exitProgram();
        resolve({ name: chosenLanguage, code: languages[chosenLanguage] });
      })
      .catch(reject);
  });
}

function getLanguages(stackAPIClient) {
  return new Promise((resolve, reject) => {
    let result = {};
    stackAPIClient
      .locale()
      .query()
      .find()
      .then((languages) => {
        languages.items.forEach((language) => {
          result[language.name] = language.code;
        });
        resolve(result);
      })
      .catch((error) => reject(error));
  });
}

function getEntries(stackAPIClient, contentType, language, skip, limit) {
  return new Promise((resolve, reject) => {
    stackAPIClient
      .contentType(contentType)
      .entry()
      .query({
        include_publish_details: true,
        locale: language,
        skip: skip * 100,
        limit: limit,
        include_workflow: true,
      })
      .find()
      .then((entries) => resolve(entries))
      .catch((error) => reject(error));
  });
}

function getEntriesCount(stackAPIClient, contentType, language) {
  return new Promise((resolve, reject) => {
    stackAPIClient
      .contentType(contentType)
      .entry()
      .query({ include_publish_details: true, locale: language })
      .count()
      .then((entriesData) => resolve(entriesData.entries))
      .catch((error) => reject(formatError(error)));
  });
}

function getEnvironments(stackAPIClient) {
  let result = {};
  return stackAPIClient
    .environment()
    .query()
    .find()
    .then((environments) => {
      environments.items.forEach((env) => {
        result[env['uid']] = env['name'];
      });
      return result;
    });
}

function getContentTypeCount(stackAPIClient) {
  return new Promise((resolve, reject) => {
    stackAPIClient
      .contentType()
      .query()
      .count()
      .then((contentTypes) => resolve(contentTypes.content_types))
      .catch((error) => reject(error));
  });
}

function exitProgram() {
  debug('Exiting');
  // eslint-disable-next-line no-undef
  process.exit();
}

function sanitizeData(flatData) {
  // sanitize against CSV Injections
  const CSVRegex = /^[\\+\\=@\\-]/;
  for (key in flatData) {
    if (typeof flatData[key] === 'string' && flatData[key].match(CSVRegex)) {
      flatData[key] = flatData[key].replace(/\"/g, "\"\"");
      flatData[key] = `"'${flatData[key]}"`;
    } else if (typeof flatData[key] === 'object') {
      // convert any objects or arrays to string
      // to store this data correctly in csv
      flatData[key] = JSON.stringify(flatData[key]);
    }
  }
  return flatData;
}

function cleanEntries(entries, language, environments, contentTypeUid) {
  const filteredEntries = entries.filter((entry) => {
    return entry['locale'] === language;
  });
  return filteredEntries.map((entry) => {
    let workflow = '';
    const envArr = [];
    if (entry?.publish_details?.length) {
      entry.publish_details.forEach((env) => {
        envArr.push(JSON.stringify([environments[env['environment']], env['locale'], env['time']]));
      });
    }

    delete entry.publish_details;
    delete entry.setWorkflowStage;
    if ('_workflow' in entry) {
      if (entry._workflow?.name) {
        workflow = entry['_workflow']['name'];
        delete entry['_workflow'];
      }
    }
    entry = flatten(entry);
    entry = sanitizeData(entry);
    entry['publish_details'] = envArr;
    entry['_workflow'] = workflow;
    entry['ACL'] = JSON.stringify({}); // setting ACL to empty obj
    entry['content_type_uid'] = contentTypeUid; // content_type_uid is being returned as 'uid' from the sdk for some reason

    // entry['url'] might also be wrong
    delete entry.stackHeaders;
    delete entry.update;
    delete entry.delete;
    delete entry.fetch;
    delete entry.publish;
    delete entry.unpublish;
    delete entry.import;
    delete entry.publishRequest;
    return entry;
  });
}

function getDateTime() {
  let date = new Date();
  let dateTime = date.toLocaleString().split(',');
  dateTime[0] = dateTime[0].split('/').join('-');
  dateTime[1] = dateTime[1].trim(); // trim the space before time
  dateTime[1] = dateTime[1].split(' ').join('');
  return dateTime.join('_');
}

function write(command, entries, fileName, message, delimiter, headers) {
  // eslint-disable-next-line no-undef
  if (process.cwd().split(delimeter).pop() !== 'data' && !fs.existsSync(directory)) {
    mkdirp.sync(directory);
  }
  // eslint-disable-next-line no-undef
  if (process.cwd().split(delimeter).pop() !== 'data') {
    // eslint-disable-next-line no-undef
    process.chdir(directory);
  }
  // eslint-disable-next-line no-undef
  cliux.print(`Writing ${message} to file: ${process.cwd()}${delimeter}${fileName}`);
  if (headers?.length) fastcsv.writeToPath(fileName, entries, { headers, delimiter });
  else fastcsv.writeToPath(fileName, entries, { headers: true, delimiter });
}

function startupQuestions() {
  return new Promise((resolve, reject) => {
    let actions = [
      {
        type: 'list',
        name: 'action',
        message: 'Choose Action',
        choices: [config.exportEntries, config.exportUsers, config.exportTeams, config.exportTaxonomies, 'Exit'],
      },
    ];
    inquirer
      .prompt(actions)
      .then((answers) => {
        if (answers.action === 'Exit') exitProgram();
        resolve(answers.action);
      })
      .catch(reject);
  });
}

function getOrgUsers(managementAPIClient, orgUid) {
  return new Promise((resolve, reject) => {
    managementAPIClient
      .getUser({ include_orgs_roles: true })
      .then(async (response) => {
        let organization = response.organizations.filter((org) => org.uid === orgUid).pop();
        if (!organization) return reject(new Error('Org UID not found.'));
        if (organization.is_owner === true) {
          return managementAPIClient
            .organization(organization.uid)
            .getInvitations()
            .then((data) => {
              resolve({ items: data.items });
            })
            .catch(reject);
        }
        if (!organization.getInvitations && !find(organization.org_roles, 'admin')) {
          return reject(new Error(config.adminError));
        }
        try {
          const users = await getUsers(managementAPIClient, organization, { skip: 0, page: 1, limit: 100 });
          return resolve({ items: users });
        } catch (error) {
          return reject(error);
        }
      })
      .catch((error) => reject(error));
  });
}

async function getUsers(managementAPIClient, organization, params, result = []) {
  try {
    const users = await managementAPIClient.organization(organization.uid).getInvitations(params);
    if (!users.items || (users.items && !users.items.length)) {
      return result;
    } else {
      result = result.concat(users.items);
      params.skip = params.page * params.limit;
      params.page++;
      await wait(200);
      return getUsers(managementAPIClient, organization, params, result);
    }
  } catch (error) {}
}

function getMappedUsers(users) {
  let mappedUsers = {};
  users.items.forEach((user) => {
    mappedUsers[user.user_uid] = user.email;
  });
  mappedUsers['System'] = 'System';
  return mappedUsers;
}

function getMappedRoles(roles) {
  let mappedRoles = {};
  roles.items.forEach((role) => {
    mappedRoles[role.uid] = role.name;
  });
  return mappedRoles;
}

function getOrgRoles(managementAPIClient, orgUid, ecsv) {
  return new Promise((resolve, reject) => {
    managementAPIClient
      .getUser({ include_orgs_roles: true })
      .then((response) => {
        let organization = response.organizations.filter((org) => org.uid === orgUid).pop();
        if (organization.is_owner === true) {
          return managementAPIClient
            .organization(organization.uid)
            .roles()
            .then((roles) => {
              resolve({ items: roles.items });
            })
            .catch(reject);
        }
        if (!organization.roles && !find(organization.org_roles, 'admin')) {
          return reject(new Error(config.adminError));
        }

        managementAPIClient
          .organization(organization.uid)
          .roles()
          .then((roles) => {
            resolve({ items: roles.items });
          })
          .catch(reject);
      })
      .catch((error) => reject(error));
  });
}

function determineUserOrgRole(user, roles) {
  let roleName = 'No Role';
  let roleUid = user.org_roles || [];
  if (roleUid.length > 0) {
    roleUid = roleUid.shift();
    roleName = roles[roleUid];
  }
  if (user.is_owner) {
    roleName = 'Owner';
  }
  return roleName;
}

function cleanOrgUsers(orgUsers, mappedUsers, mappedRoles) {
  const userList = [];
  orgUsers.items.forEach((user) => {
    let invitedBy;
    let formattedUser = {};
    try {
      invitedBy = mappedUsers[user['invited_by']];
    } catch (error) {
      invitedBy = 'System';
    }
    formattedUser['Email'] = user['email'];
    formattedUser['User UID'] = user['user_uid'];
    formattedUser['Organization Role'] = determineUserOrgRole(user, mappedRoles);
    formattedUser['Status'] = user['status'];
    formattedUser['Invited By'] = invitedBy;
    formattedUser['Created Time'] = getFormattedDate(user['created_at']);
    formattedUser['Updated Time'] = getFormattedDate(user['updated_at']);
    userList.push(formattedUser);
  });
  return userList;
}

function kebabize(str) {
  return str
    .split(' ')
    .map((word) => word.toLowerCase())
    .join('-');
}

function getFormattedDate(date) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  const year = date.getFullYear();
  const month = (1 + date.getMonth()).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return month + '/' + day + '/' + year;
}

// https://stackoverflow.com/questions/19098797/fastest-way-to-flatten-un-flatten-nested-json-objects
function flatten(data) {
  let result = {};
  function recurse(cur, prop) {
    if (Object(cur) !== cur) {
      result[prop] = cur;
    } else if (Array.isArray(cur)) {
      let i, l;
      for (i = 0, l = cur.length; i < l; i++) recurse(cur[i], prop + '[' + i + ']');
      if (l == 0) result[prop] = [];
    } else {
      let isEmpty = true;
      for (let p in cur) {
        isEmpty = false;
        recurse(cur[p], prop ? prop + '.' + p : p);
      }
      if (isEmpty && prop) result[prop] = {};
    }
  }
  recurse(data, '');
  return result;
}

function formatError(error) {
  try {
    if (typeof error === 'string') {
      error = JSON.parse(error);
    } else {
      error = JSON.parse(error.message);
    }
  } catch (e) {}
  let message = error.errorMessage || error.error_message || error.message || error;
  if (error.errors && Object.keys(error.errors).length > 0) {
    Object.keys(error.errors).forEach((e) => {
      let entity = e;
      switch (e) {
        case 'authorization':
          entity = 'Management Token';
          break;
        case 'api_key':
          entity = 'Stack API key';
          break;
        case 'uid':
          entity = 'Content Type';
          break;
        case 'access_token':
          entity = 'Delivery Token';
          break;
      }
      message += ' ' + [entity, error.errors[e]].join(' ');
    });
  }
  return message;
}

function wait(time) {
  return new Promise((res) => {
    setTimeout(res, time);
  });
}

function handleErrorMsg(err) {
  cliux.print(`Error: ${(err?.errorMessage || err?.message) ?? messageHandler.parse('CLI_EXPORT_CSV_API_FAILED')}`, {
    color: 'red',
  });
  process.exit(1);
}

async function getAllTeamsUsingSDK(managementAPIClient, org, queryParam = {}) {
  try {
    const teamsData = await managementAPIClient.organization(org.uid).teams().fetchAll(queryParam);
    return teamsData;
  } catch (error) {
    handleErrorMsg(error);
  }
}

async function exportOrgTeams(managementAPIClient, org) {
  let teamsObjectArray = [];
  let skip = 0;
  let limit = config?.limit || 100;
  do {
    const data = await getAllTeamsUsingSDK(managementAPIClient, org, {
      skip: skip,
      limit: limit,
      includeUserDetails: true,
    });
    skip += limit;
    teamsObjectArray.push(...data.items);
    if (skip >= data?.count) break;
  } while (1);
  teamsObjectArray = await cleanTeamsData(teamsObjectArray, managementAPIClient, org);
  return teamsObjectArray;
}

async function getOrgRolesForTeams(managementAPIClient, org) {
  let roleMap = {}; // for org level there are two roles only admin and member

  // SDK call to get the role UIDs
  await managementAPIClient
    .organization(org.uid)
    .roles()
    .then((roles) => {
      roles.items.forEach((item) => {
        if (item.name === 'member' || item.name === 'admin') {
          roleMap[item.name] = item.uid;
        }
      });
    })
    .catch((err) => {
      handleErrorMsg(err);
    });
  return roleMap;
}

async function cleanTeamsData(data, managementAPIClient, org) {
  const roleMap = await getOrgRolesForTeams(managementAPIClient, org);
  const fieldToBeDeleted = [
    '_id',
    'createdAt',
    'createdBy',
    'updatedAt',
    'updatedBy',
    '__v',
    'createdByUserName',
    'updatedByUserName',
    'organizationUid',
    'urlPath',
    'update',
    'delete',
    'fetch',
    'stackRoleMappings',
    'teamUsers'
  ];
  if (data?.length) {
    return data.map((team) => {
      team = omit(team, fieldToBeDeleted);

      team.organizationRole = team.organizationRole === roleMap['member'] ? 'member' : 'admin';

      if (!team.hasOwnProperty('description')) {
        team.description = '';
      }
      team.Total_Members = team?.users?.length || 0;

      return team;
    });
  } else {
    return [];
  }
}

async function exportTeams(managementAPIClient, organization, teamUid, delimiter) {
  cliux.print(
    `info: Exporting the ${
      teamUid && organization?.name
        ? `team with uid ${teamUid} in Organisation ${organization?.name} `
        : `teams of Organisation ` + organization?.name
    }`,
    { color: 'blue' },
  );
  const allTeamsData = await exportOrgTeams(managementAPIClient, organization);
  if (!allTeamsData?.length) {
    cliux.print(
      `info: The organization ${organization?.name} does not have any teams associated with it. Please verify and provide the correct organization name.`,
    );
  } else {
    const modifiedTeam = cloneDeep(allTeamsData);
    modifiedTeam.forEach((team) => {
      delete team['users'];
      delete team['stackRoleMapping'];
    });
    const fileName = `${kebabize(organization.name.replace(config.organizationNameRegex, ''))}_teams_export.csv`;
    write(this, modifiedTeam, fileName, ' organization Team details', delimiter);
    // exporting teams user data or a single team user data
    cliux.print(
      `info: Exporting the teams user data for ${teamUid ? `team ` + teamUid : `organisation ` + organization?.name}`,
      { color: 'blue' },
    );
    await getTeamsDetail(allTeamsData, organization, teamUid, delimiter);
    cliux.print(
      `info: Exporting the stack role details for  ${
        teamUid ? `team ` + teamUid : `organisation ` + organization?.name
      }`,
      { color: 'blue' },
    );
    // Exporting the stack Role data for all the teams or exporting stack role data for a single team
    await exportRoleMappings(managementAPIClient, allTeamsData, teamUid, delimiter);
  }
}

async function getTeamsDetail(allTeamsData, organization, teamUid, delimiter) {
  if (!teamUid) {
    const userData = await getTeamsUserDetails(allTeamsData);
    const fileName = `${kebabize(
      organization.name.replace(config.organizationNameRegex, ''),
    )}_team_User_Details_export.csv`;

    write(this, userData, fileName, 'Team User details', delimiter);
  } else {
    const team = allTeamsData.filter((team) => team.uid === teamUid)[0];
    await team.users.forEach((user) => {
      user['team-name'] = team.name;
      user['team-uid'] = team.uid;
      delete user['active'];
      delete user['orgInvitationStatus'];
    });
    const fileName = `${kebabize(
      organization.name.replace(config.organizationNameRegex, ''),
    )}_team_${teamUid}_User_Details_export.csv`;

    write(this, team.users, fileName, 'Team User details', delimiter);
  }
}

async function exportRoleMappings(managementAPIClient, allTeamsData, teamUid, delimiter) {
  let stackRoleWithTeamData = [];
  let flag = false;
  const stackNotAdmin = [];
  if (teamUid) {
    const team = find(allTeamsData, function (teamObject) {
      return teamObject?.uid === teamUid;
    });
    for (const stack of team?.stackRoleMapping) {
      const roleData = await mapRoleWithTeams(managementAPIClient, stack, team?.name, team?.uid);
      stackRoleWithTeamData.push(...roleData);
      if (roleData[0]['Stack Name'] === '') {
        flag = true;
        stackNotAdmin.push(stack.stackApiKey);
      }
    }
  } else {
    for (const team of allTeamsData ?? []) {
      for (const stack of team?.stackRoleMapping ?? []) {
        const roleData = await mapRoleWithTeams(managementAPIClient, stack, team?.name, team?.uid);
        stackRoleWithTeamData.push(...roleData);
        if (roleData[0]['Stack Name'] === '') {
          flag = true;
          stackNotAdmin.push(stack.stackApiKey);
        }
      }
    }
  }
  if (stackNotAdmin?.length) {
    cliux.print(
      `warning: Admin access denied to the following stacks using the provided API keys. Please get in touch with the stack owner to request access.`,
      { color: 'yellow' },
    );
    cliux.print(`${stackNotAdmin.join(' , ')}`, { color: 'yellow' });
  }
  if (flag) {
    let export_stack_role = [
      {
        type: 'list',
        name: 'chooseExport',
        message: `Access denied: Please confirm if you still want to continue exporting the data without the { Stack Name, Stack Uid, Role Name } fields.`,
        choices: ['yes', 'no'],
        loop: false,
      },
    ];
    try {
      const exportStackRole = await inquirer.prompt(export_stack_role);
      if(exportStackRole.chooseExport==='no') {
        process.exit(1);
      }
    } catch (error) {
      cliux.print(error, { color: 'red' });
      process.exit(1);
    }
  }

  const fileName = `${kebabize('Stack_Role_Mapping'.replace(config.organizationNameRegex, ''))}${
    teamUid ? `_${teamUid}` : ''
  }.csv`;

  write(this, stackRoleWithTeamData, fileName, 'Team Stack Role details', delimiter);
}

async function mapRoleWithTeams(managementAPIClient, stackRoleMapping, teamName, teamUid) {
  const roles = await getRoleData(managementAPIClient, stackRoleMapping.stackApiKey);
  const stackRole = {};
  roles?.items?.forEach((role) => {
    if (!stackRole.hasOwnProperty(role?.uid)) {
      stackRole[role?.uid] = role?.name;
      stackRole[role?.stack?.api_key] = { name: role?.stack?.name, uid: role?.stack?.uid };
    }
  });
  const stackRoleMapOfTeam = stackRoleMapping?.roles.map((role) => {
    return {
      'Team Name': teamName,
      'Team Uid': teamUid,
      'Stack Name': stackRole[stackRoleMapping?.stackApiKey]?.name || '',
      'Stack Uid': stackRole[stackRoleMapping?.stackApiKey]?.uid || '',
      'Role Name': stackRole[role] || '',
      'Role Uid': role || '',
    };
  });
  return stackRoleMapOfTeam;
}

async function getRoleData(managementAPIClient, stackApiKey) {
  try {
    return await managementAPIClient.stack({ api_key: stackApiKey }).role().fetchAll();
  } catch (error) {
    return {};
  }
}

async function getTeamsUserDetails(teamsObject) {
  const allTeamUsers = [];
  teamsObject.forEach((team) => {
    if (team?.users?.length) {
      team.users.forEach((user) => {
        user['team-name'] = team.name;
        user['team-uid'] = team.uid;
        delete user['active'];
        delete user['orgInvitationStatus'];
        allTeamUsers.push(user);
      });
    }
  });
  return allTeamUsers;
}

/**
 * fetch all taxonomies in the provided stack
 * @param {object} payload
 * @param {number} skip
 * @param {array} taxonomies
 * @returns
 */
async function getAllTaxonomies(payload, skip = 0, taxonomies = []) {
  payload['type'] = 'taxonomies';
  const { items, count } = await taxonomySDKHandler(payload, skip);
  if (items) {
    skip += payload.limit;
    taxonomies.push(...items);
    if (skip >= count) {
      return taxonomies;
    } else {
      return getAllTaxonomies(payload, skip, taxonomies);
    }
  }
  return taxonomies;
}

/**
 * fetch taxonomy related terms
 * @param {object} payload
 * @param {number} skip
 * @param {number} limit
 * @param {array} terms
 * @returns
 */
async function getAllTermsOfTaxonomy(payload, skip = 0, terms = []) {
  payload['type'] = 'terms';
  const { items, count } = await taxonomySDKHandler(payload, skip);
  if (items) {
    skip += payload.limit;
    terms.push(...items);
    if (skip >= count) {
      return terms;
    } else {
      return getAllTermsOfTaxonomy(payload, skip, terms);
    }
  }
  return terms;
}

/**
 * Verify the existence of a taxonomy. Obtain its details if it exists and return
 * @param {object} payload
 * @param {string} taxonomyUID
 * @returns
 */
async function getTaxonomy(payload) {
  payload['type'] = 'taxonomy';
  const resp = await taxonomySDKHandler(payload);
  return resp;
}

/**
 * taxonomy & term sdk handler
 * @async
 * @method
 * @param payload
 * @param skip
 * @param limit
 * @returns  {*} Promise<any>
 */
async function taxonomySDKHandler(payload, skip) {
  const { stackAPIClient, taxonomyUID, type } = payload;

  const queryParams = { include_count: true, limit: payload.limit };
  if (skip >= 0) queryParams['skip'] = skip || 0;

  switch (type) {
    case 'taxonomies':
      return await stackAPIClient
        .taxonomy()
        .query(queryParams)
        .find()
        .then((data) => data)
        .catch((err) => handleErrorMsg(err));
    case 'taxonomy':
      return await stackAPIClient
        .taxonomy(taxonomyUID)
        .fetch()
        .then((data) => data)
        .catch((err) => handleErrorMsg(err));
    case 'terms':
      queryParams['depth'] = 0;
      return await stackAPIClient
        .taxonomy(taxonomyUID)
        .terms()
        .query(queryParams)
        .find()
        .then((data) => data)
        .catch((err) => handleErrorMsg(err));
    default:
      handleErrorMsg({ errorMessage: 'Invalid module!' });
  }
}

/**
 * Change taxonomies data in required CSV headers format
 * @param {array} taxonomies
 * @returns
 */
function formatTaxonomiesData(taxonomies) {
  if (taxonomies?.length) {
    const formattedTaxonomies = taxonomies.map((taxonomy) => {
      return sanitizeData({
        'Taxonomy UID': taxonomy.uid,
        Name: taxonomy.name,
        Description: taxonomy.description,
      });
    });
    return formattedTaxonomies;
  }
}

/**
 * Modify the linked taxonomy data's terms in required CSV headers format
 * @param {array} terms
 * @param {string} taxonomyUID
 * @returns
 */
function formatTermsOfTaxonomyData(terms, taxonomyUID) {
  if (terms?.length) {
    const formattedTerms = terms.map((term) => {
      return sanitizeData({
        'Taxonomy UID': taxonomyUID,
        UID: term.uid,
        Name: term.name,
        'Parent UID': term.parent_uid,
        Depth: term.depth,
      });
    });
    return formattedTerms;
  }
}

function handleErrorMsg(err) {
  if (err?.errorMessage) {
    cliux.print(`Error: ${err.errorMessage}`, { color: 'red' });
  } else if (err?.message) {
    const errorMsg = err?.errors?.taxonomy || err?.errors?.term || err?.message;
    cliux.print(`Error: ${errorMsg}`, { color: 'red' });
  } else {
    console.log(err);
    cliux.print(`Error: ${messageHandler.parse('CLI_EXPORT_CSV_API_FAILED')}`, { color: 'red' });
  }
  process.exit(1);
}

/**
 * create an importable CSV file, to utilize with the migration script.
 * @param {*} payload api request payload
 * @param {*} taxonomies taxonomies data
 * @returns
 */
async function createImportableCSV(payload, taxonomies) {
  let taxonomiesData = [];
  let headers = ['Taxonomy Name', 'Taxonomy UID', 'Taxonomy Description'];
  for (let index = 0; index < taxonomies?.length; index++) {
    const taxonomy = taxonomies[index];
    const taxonomyUID = taxonomy?.uid;
    if (taxonomyUID) {
      const sanitizedTaxonomy = sanitizeData({
        'Taxonomy Name': taxonomy?.name,
        'Taxonomy UID': taxonomyUID,
        'Taxonomy Description': taxonomy?.description,
      });
      taxonomiesData.push(sanitizedTaxonomy);
      payload['taxonomyUID'] = taxonomyUID;
      const terms = await getAllTermsOfTaxonomy(payload);
      //fetch all parent terms
      const parentTerms = terms.filter((term) => term?.parent_uid === null);
      const termsData = getParentAndChildTerms(parentTerms, terms, headers);
      taxonomiesData.push(...termsData);
    }
  }

  return { taxonomiesData, headers };
}

/**
 * Get the parent and child terms, then arrange them hierarchically in a CSV file.
 * @param {*} parentTerms list of parent terms
 * @param {*} terms respective terms of taxonomies
 * @param {*} headers list of csv headers include taxonomy and terms column
 * @param {*} termsData parent and child terms
 */
function getParentAndChildTerms(parentTerms, terms, headers, termsData = []) {
  for (let i = 0; i < parentTerms?.length; i++) {
    const parentTerm = parentTerms[i];
    const levelUID = `Term Level${parentTerm.depth} UID`;
    const levelName = `Term Level${parentTerm.depth} Name`;
    if (headers.indexOf(levelName) === -1) headers.push(levelName);
    if (headers.indexOf(levelUID) === -1) headers.push(levelUID);
    const sanitizedTermData = sanitizeData({ [levelName]: parentTerm.name, [levelUID]: parentTerm.uid });
    termsData.push(sanitizedTermData);
    //fetch all sibling terms
    const newParents = terms.filter((term) => term.parent_uid === parentTerm.uid);
    if (newParents?.length) {
      getParentAndChildTerms(newParents, terms, headers, termsData);
    }
  }
  return termsData;
}

module.exports = {
  chooseOrganization: chooseOrganization,
  chooseStack: chooseStack,
  chooseBranch: chooseBranch,
  chooseContentType: chooseContentType,
  chooseLanguage: chooseLanguage,
  getEntries: getEntries,
  getEnvironments: getEnvironments,
  cleanEntries: cleanEntries,
  write: write,
  startupQuestions: startupQuestions,
  getDateTime: getDateTime,
  getOrgUsers: getOrgUsers,
  getOrgRoles: getOrgRoles,
  getMappedUsers: getMappedUsers,
  getMappedRoles: getMappedRoles,
  cleanOrgUsers: cleanOrgUsers,
  determineUserOrgRole: determineUserOrgRole,
  getOrganizationsWhereUserIsAdmin: getOrganizationsWhereUserIsAdmin,
  kebabize: kebabize,
  flatten: flatten,
  getContentTypeCount: getContentTypeCount,
  getContentTypes: getContentTypes,
  chooseInMemContentTypes: chooseInMemContentTypes,
  getEntriesCount: getEntriesCount,
  formatError: formatError,
  exportOrgTeams: exportOrgTeams,
  exportTeams: exportTeams,
  getAllTaxonomies,
  getAllTermsOfTaxonomy,
  formatTaxonomiesData,
  formatTermsOfTaxonomyData,
  getTaxonomy,
  getStacks,
  createImportableCSV,
};
