#!/bin/bash

echo 'Installing Contentstack CLI'
npm run setup-repo || { echo -e '\e[31mFailed to install root dependencies.' && exit 1; }
echo 'Installtion, Done!!!'
cd packages/contentstack || { echo -e '\e[31mCould not found the working directory.' && exit 1; }
./bin/run --help