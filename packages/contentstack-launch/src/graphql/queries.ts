import { gql, DocumentNode } from "@apollo/client/core";

const userConnectionsQuery: DocumentNode = gql`
  query UserConnections(
    $query: QueryUserConnectionInput! = { provider: "GitHub" }
  ) {
    userConnections: UserConnections(query: $query) {
      userUid
      provider
    }
  }
`;

const repositoriesQuery: DocumentNode = gql`
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

const frameworkQuery = gql`
  query Framework($query: GitProviderFrameworkInput!) {
    framework: Framework(query: $query) {
      framework
    }
  }
`;

const fileFrameworkQuery = gql`
  query FileFramework($query: FileUploadFrameworkInput!) {
    framework: FileFramework(query: $query) {
      framework
    }
  }
`;

const cmsEnvironmentVariablesQuery = gql`
  query cmsEnvironmentVariables {
    envVariables: cmsEnvironmentVariables {
      key
      keyName
      value
    }
  }
`;

const branchesQuery = gql`
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

const projectsQuery: DocumentNode = gql`
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
            repositoryName
            repositoryUrl
            username
            gitProviderMetadata {
              ... on GitHubMetadata {
                connectionUid
                gitProvider
              }
            }
          }
        }
      }
    }
  }
`;

const deploymentQuery: DocumentNode = gql`
  query getDeploymentsById($query: DeploymentInput!) {
    Deployment(query: $query) {
      status
      uid
    }
  }
`;

const deploymentLogsQuery: DocumentNode = gql`
  query GetLogs($deploymentUid: ID!, $timestamp: String) {
    getLogs(deploymentUid: $deploymentUid, timestamp: $timestamp) {
      deploymentUid
      message
      stage
      timestamp
    }
  }
`;

const serverlessLogsQuery: DocumentNode = gql`
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

const latestLiveDeploymentQuery: DocumentNode = gql`
  query LatestLiveDeployment($query: QueryDeploymentsInput!) {
    latestLiveDeployment(query: $query) {
      uid
      environment
      deploymentNumber
      deploymentUrl
    }
  }
`;

const environmentsQuery: DocumentNode = gql`
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

export {
  projectsQuery,
  branchesQuery,
  frameworkQuery,
  repositoriesQuery,
  fileFrameworkQuery,
  userConnectionsQuery,
  cmsEnvironmentVariablesQuery,
  deploymentQuery,
  deploymentLogsQuery,
  serverlessLogsQuery,
  latestLiveDeploymentQuery,
  environmentsQuery,
};
