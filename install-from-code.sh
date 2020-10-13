#!/bin/bash
# ----------------------------------
# Colors
# ----------------------------------
NOCOLOR='\033[0m'
RED='\033[0;31m'
GREEN='\033[0;32m'
ORANGE='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
LIGHTGRAY='\033[0;37m'
DARKGRAY='\033[1;30m'
LIGHTRED='\033[1;31m'
LIGHTGREEN='\033[1;32m'
YELLOW='\033[1;33m'
LIGHTBLUE='\033[1;34m'
LIGHTPURPLE='\033[1;35m'
LIGHTCYAN='\033[1;36m'
WHITE='\033[1;37m'


mkdir -p build || { echo -e '\e[31mFailed to create build folder.' && exit 1; }
cp -r dependency build
npm install || { echo -e '\e[31mFailed to install root dependencies.' && exit 1; }
npx lerna bootstrap
npx lerna run pack || { echo -e '\e[31mInstallable tarball creation failed.' && exit 1; }
echo 'Building CLI package...'
npx lerna run build || { echo -e '\e[31mBuild generation failed for core module.' ; exit 1; }
echo 'Built CLI package, Done!!!'
cd build/@contentstack/packages
echo 'Installing Contentstack CLI globally'
sudo npm install -g ./contentstack-cli.tgz  || { echo -e '\e[31mGlobal installation failed for CLI module!!!' ; exit 1; }
echo 'Installtion, Done!!!'
echo 'Testing Contentstack Command...'
csdx || { echo -e '\e[31mSomething went wrong while build generation command not installed properly!!!' ; exit 1; }
echo 'Installtion completed successfully!!!'