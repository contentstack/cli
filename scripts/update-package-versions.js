#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function getLatestVersion(packageName) {
  try {
    const output = execSync(`npm view ${packageName} version`, { encoding: 'utf8' });
    return output.trim();
  } catch (error) {
    console.error(`Error fetching version for ${packageName}:`, error.message);
    return null;
  }
}

async function updatePackageVersions() {
  const packageJsonPath = path.join(process.cwd(), 'packages/contentstack/package.json');
  const packageJson = require(packageJsonPath);
  const dependencies = packageJson.dependencies;
  
  for (const [packageName, version] of Object.entries(dependencies)) {
    if (packageName.startsWith('@contentstack/')) {
      const latestVersion = await getLatestVersion(packageName);
      if (latestVersion) {
        dependencies[packageName] = `~${latestVersion}`;
        console.log(`Updated ${packageName} to version ${latestVersion}`);
      }
    }
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('\nPackage versions updated successfully!');
}

updatePackageVersions().catch(console.error); 