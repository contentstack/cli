"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.environmentsQuery = exports.latestLiveDeploymentQuery = exports.serverlessLogsQuery = exports.deploymentLogsQuery = exports.deploymentQuery = exports.cmsEnvironmentVariablesQuery = exports.userConnectionsQuery = exports.fileFrameworkQuery = exports.repositoriesQuery = exports.frameworkQuery = exports.branchesQuery = exports.projectsQuery = void 0;
const core_1 = require("@apollo/client/core");
const userConnectionsQuery = (0, core_1.gql) `
  query UserConnections(
    $query: QueryUserConnectionInput! = { provider: "GitHub" }
  ) {
    userConnections: UserConnections(query: $query) {
      userUid
      provider
    }
  }
`;
exports.userConnectionsQuery = userConnectionsQuery;
const repositoriesQuery = (0, core_1.gql) `
  query Repositories(
    $repositoriesInput: RepositoriesInput! = { provider: "GitHub" }
  ) {
    repositories: Repositories(query: $repositoriesInput) {
      id
      url
      name
      fullName
      defaultBranch
    }
  }
`;
exports.repositoriesQuery = repositoriesQuery;
const frameworkQuery = (0, core_1.gql) `
  query Framework($query: GitProviderFrameworkInput!) {
    framework: Framework(query: $query) {
      framework
    }
  }
`;
exports.frameworkQuery = frameworkQuery;
const fileFrameworkQuery = (0, core_1.gql) `
  query FileFramework($query: FileUploadFrameworkInput!) {
    framework: FileFramework(query: $query) {
      framework
    }
  }
`;
exports.fileFrameworkQuery = fileFrameworkQuery;
const cmsEnvironmentVariablesQuery = (0, core_1.gql) `
  query cmsEnvironmentVariables {
    envVariables: cmsEnvironmentVariables {
      key
      keyName
      value
    }
  }
`;
exports.cmsEnvironmentVariablesQuery = cmsEnvironmentVariablesQuery;
const branchesQuery = (0, core_1.gql) `
  query GitBranches(
    $first: Float = 100
    $page: Float = 1
    $query: BranchesInput!
  ) {
    branches: GitBranches(query: $query, first: $first, page: $page) {
      edges {
        node {
          name
        }
        cursor
      }
      pageData {
        page
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;
exports.branchesQuery = branchesQuery;
const projectsQuery = (0, core_1.gql) `
  query Projects($query: QueryProjectsInput!) {
    projects: Projects(query: $query) {
      edges {
        node {
          uid
          name
          createdAt
          updatedAt
          createdBy
          updatedBy
          description
          projectType
          cmsStackApiKey
          organizationUid
          repository {
            gitProvider
            gitProviderConnectionUid
            repositoryName
            repositoryUrl
            username
          }
        }
      }
    }
  }
`;
exports.projectsQuery = projectsQuery;
const deploymentQuery = (0, core_1.gql) `
  query getDeploymentsById($query: DeploymentInput!) {
    Deployment(query: $query) {
      status
      uid
    }
  }
`;
exports.deploymentQuery = deploymentQuery;
const deploymentLogsQuery = (0, core_1.gql) `
  query GetLogs($deploymentUid: ID!, $timestamp: String) {
    getLogs(deploymentUid: $deploymentUid, timestamp: $timestamp) {
      deploymentUid
      message
      stage
      timestamp
    }
  }
`;
exports.deploymentLogsQuery = deploymentLogsQuery;
const serverlessLogsQuery = (0, core_1.gql) `
  query GetServerlessLogs($query: QueryLogMessagesInputType!) {
    getServerlessLogs(query: $query) {
      logs {
        level
        message
        timestamp
      }
    }
  }
`;
exports.serverlessLogsQuery = serverlessLogsQuery;
const latestLiveDeploymentQuery = (0, core_1.gql) `
  query LatestLiveDeployment($query: QueryDeploymentsInput!) {
    latestLiveDeployment(query: $query) {
      uid
      environment
      deploymentNumber
      deploymentUrl
    }
  }
`;
exports.latestLiveDeploymentQuery = latestLiveDeploymentQuery;
const environmentsQuery = (0, core_1.gql) `
  query Environments {
    Environments {
      edges {
        node {
          uid
          name
          frameworkPreset
          deployments {
            edges {
              node {
                uid
                createdAt
                commitMessage
                deploymentUrl
                deploymentNumber
              }
            }
          }
        }
      }
    }
  }
`;
exports.environmentsQuery = environmentsQuery;
