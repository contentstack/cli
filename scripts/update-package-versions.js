#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const semver = require('semver');

// Get all workspace package.json files
function getWorkspacePackages() {
  const packagesDir = path.join(process.cwd(), 'packages');
  return fs.readdirSync(packagesDir)
    .filter(dir => fs.statSync(path.join(packagesDir, dir)).isDirectory())
    .map(dir => ({
      name: dir,
      path: path.join(packagesDir, dir, 'package.json'),
      json: require(path.join(packagesDir, dir, 'package.json'))
    }));
}

async function getPackageInfo(packageName) {
  try {
    const output = execSync(`npm view ${packageName} --json`, { encoding: 'utf8' });
    return JSON.parse(output);
  } catch (error) {
    console.error(`Error fetching info for ${packageName}:`, error.message);
    return null;
  }
}

async function validateVersionBump(packageName, currentVersion, newVersion) {
  const info = await getPackageInfo(packageName);
  if (!info) return { valid: false, reason: 'Could not fetch package info' };

  // Check if version already exists
  if (info.versions.includes(newVersion)) {
    return { valid: false, reason: `Version ${newVersion} already exists` };
  }

  // Check if version bump is valid (no skipping)
  const latestVersion = info['dist-tags'].latest;
  if (semver.gt(newVersion, latestVersion)) {
    const bump = semver.diff(latestVersion, newVersion);
    const allowedBumps = ['patch', 'minor', 'major'];
    if (!allowedBumps.includes(bump)) {
      return { 
        valid: false, 
        reason: `Invalid version bump from ${latestVersion} to ${newVersion}. Must be patch, minor, or major.`
      };
    }
  }

  // Check peer dependencies
  const peerDeps = info.peerDependencies || {};
  const conflicts = [];
  for (const [peer, range] of Object.entries(peerDeps)) {
    const peerInfo = await getPackageInfo(peer);
    if (peerInfo && !semver.satisfies(peerInfo['dist-tags'].latest, range)) {
      conflicts.push(`${peer}@${range}`);
    }
  }
  
  if (conflicts.length > 0) {
    return {
      valid: false,
      reason: `Peer dependency conflicts: ${conflicts.join(', ')}`
    };
  }

  return { valid: true };
}

async function validatePublishReadiness(packageJson) {
  const checks = [];
  
  // Check required fields
  const requiredFields = ['name', 'version', 'description', 'main', 'author', 'license'];
  for (const field of requiredFields) {
    if (!packageJson[field]) {
      checks.push(`Missing required field: ${field}`);
    }
  }

  // Check scripts
  const requiredScripts = ['build', 'test', 'prepack'];
  for (const script of requiredScripts) {
    if (!packageJson.scripts?.[script]) {
      checks.push(`Missing required script: ${script}`);
    }
  }

  // Check dependencies format
  const depTypes = ['dependencies', 'devDependencies', 'peerDependencies'];
  for (const type of depTypes) {
    const deps = packageJson[type] || {};
    for (const [dep, version] of Object.entries(deps)) {
      if (!version.match(/^[~^]?\d+\.\d+\.\d+$/)) {
        checks.push(`Invalid ${type} version format for ${dep}: ${version}`);
      }
    }
  }

  return checks;
}

async function updatePackageVersions(dryRun = false) {
  const packages = getWorkspacePackages();
  const updates = [];
  const validationErrors = [];

  for (const pkg of packages) {
    const dependencies = { 
      ...pkg.json.dependencies,
      ...pkg.json.devDependencies 
    };
    
    for (const [packageName, version] of Object.entries(dependencies)) {
      if (packageName.startsWith('@contentstack/')) {
        const info = await getPackageInfo(packageName);
        if (!info) continue;

        const latestVersion = info['dist-tags'].latest;
        const currentVersion = version.replace(/[~^]/, '');
        
        if (semver.gt(latestVersion, currentVersion)) {
          const validation = await validateVersionBump(packageName, currentVersion, latestVersion);
          
          if (validation.valid) {
            updates.push({
              package: pkg.name,
              dependency: packageName,
              from: version,
              to: `~${latestVersion}`
            });
          } else {
            validationErrors.push({
              package: pkg.name,
              dependency: packageName,
              error: validation.reason
            });
          }
        }
      }
    }

    // Validate publish readiness
    const publishChecks = await validatePublishReadiness(pkg.json);
    if (publishChecks.length > 0) {
      validationErrors.push({
        package: pkg.name,
        error: `Publish readiness issues:\n${publishChecks.join('\n')}`
      });
    }
  }

  // Print summary
  console.log('\nVersion Update Summary:');
  console.log('=====================');
  
  if (updates.length > 0) {
    console.log('\nProposed Updates:');
    updates.forEach(update => {
      console.log(`${update.package}: ${update.dependency} ${update.from} → ${update.to}`);
    });
  } else {
    console.log('No updates required.');
  }

  if (validationErrors.length > 0) {
    console.log('\nValidation Errors:');
    validationErrors.forEach(error => {
      console.log(`\n${error.package}:`);
      console.log(`  ${error.error}`);
    });
  }

  // Apply updates if not dry run and no validation errors
  if (!dryRun && validationErrors.length === 0 && updates.length > 0) {
    for (const pkg of packages) {
      const pkgUpdates = updates.filter(u => u.package === pkg.name);
      if (pkgUpdates.length > 0) {
        pkgUpdates.forEach(update => {
          if (pkg.json.dependencies?.[update.dependency]) {
            pkg.json.dependencies[update.dependency] = update.to;
          }
          if (pkg.json.devDependencies?.[update.dependency]) {
            pkg.json.devDependencies[update.dependency] = update.to;
          }
        });
        fs.writeFileSync(pkg.path, JSON.stringify(pkg.json, null, 2));
      }
    }
    console.log('\nUpdates applied successfully!');
  }

  return validationErrors.length === 0;
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Run the script
updatePackageVersions(dryRun).then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 