"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSignedUploadUrlMutation = exports.createDeploymentMutation = exports.importProjectMutation = void 0;
const core_1 = require("@apollo/client/core");
const createDeploymentMutation = (0, core_1.gql) `
  mutation CreateDeployment(
    $deployment: CreateDeploymentInput!
    $skipGitData: Boolean = false
  ) {
    deployment: createDeployment(deployment: $deployment) {
      uid
      status
      commitUrl @skip(if: $skipGitData)
      createdAt
      updatedAt
      commitHash @skip(if: $skipGitData)
      commitMessage
      deploymentUrl
    }
  }
`;
exports.createDeploymentMutation = createDeploymentMutation;
const createSignedUploadUrlMutation = (0, core_1.gql) `
  mutation CreateSignedUploadUrl($secured: Boolean = true) {
    signedUploadUrl: createSignedUploadUrl(secured: $secured) {
      expiresIn
      uploadUid
      uploadUrl
      fields {
        formFieldKey
        formFieldValue
      }
    }
  }
`;
exports.createSignedUploadUrlMutation = createSignedUploadUrlMutation;
const importProjectMutation = (0, core_1.gql) `
  mutation importProject(
    $project: ImportProjectInput!
    $skipGitData: Boolean = false
  ) {
    project: importProject(project: $project) {
      uid
      name
      projectType
      organizationUid
      environments {
        uid
        name
        frameworkPreset
        deployments {
          edges {
            node {
              uid
              status
              commitUrl @skip(if: $skipGitData)
              createdAt
              updatedAt
              deploymentUrl
              commitHash @skip(if: $skipGitData)
              commitMessage
            }
          }
        }
      }
      repository @skip(if: $skipGitData) {
        username
        gitProvider
        repositoryName
      }
    }
  }
`;
exports.importProjectMutation = importProjectMutation;
