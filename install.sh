#!/bin/bash

echo 'Installing Contentstack CLI'
npm install || { echo -e '\e[31mFailed to install root dependencies.' && exit 1; }
npx lerna clean -y
npx lerna bootstrap --force-local
npx lerna run prepack || { echo -e '\e[31mInstallable tarball creation failed.' && exit 1; }
echo 'Installtion, Done!!!'
cd packages/contentstack || { echo -e '\e[31mCould not found the working directory.' && exit 1; }
./bin/run --help