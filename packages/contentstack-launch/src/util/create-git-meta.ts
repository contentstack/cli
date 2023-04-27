import * as ini from "ini";
import { readFileSync } from "fs";

export async function parseGitConfig(configPath: string) {
  try {
    return ini.parse(readFileSync(configPath, "utf-8"));
  } catch (err: unknown) {
    // console.log(err)
  }
}

export function pluckRemoteUrls(gitConfig: {
  [key: string]: any;
}): { [key: string]: string } | undefined {
  let remoteUrls: { [key: string]: string } = {};

  for (const key of Object.keys(gitConfig)) {
    if (key.includes("remote")) {
      // ex. remote "origin" — matches origin
      const remoteName = key.match(/(?<=").*(?=")/g)?.[0];
      const remoteUrl = gitConfig[key]?.url;
      if (remoteName && remoteUrl) {
        remoteUrls[remoteName] = remoteUrl;
      }
    }
  }

  if (Object.keys(remoteUrls).length === 0) {
    return;
  }

  return remoteUrls;
}

export async function getRemoteUrls(configPath: string): Promise<{ [key: string]: string } | undefined> {
  const config = await parseGitConfig(configPath);
  if (!config) {
    return;
  }

  const remoteUrls = pluckRemoteUrls(config);
  return remoteUrls;
}
