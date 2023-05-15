import { gql, DocumentNode } from "@apollo/client/core";

const createDeploymentMutation: DocumentNode = gql`
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

const createSignedUploadUrlMutation: DocumentNode = gql`
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

const importProjectMutation: DocumentNode = gql`
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

export {
  importProjectMutation,
  createDeploymentMutation,
  createSignedUploadUrlMutation,
};
