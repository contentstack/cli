import defaultConfig from '../config';
import merge from 'merge';

const setupConfig = async (context, userInputPayload) => {
  // setup the config
    
    if (userInputPayload['external-config']) {
        const externalConfig = 
        merge.recursive()
    }
    if (userInputPayload['export-dir'])
  
  // check the dir path, if not ask the user to provide one
  // ask the user to select the stack if not provided
  // sets the authentication authtoken/mtoken
  // set branch name if provided
  // merge the external config
  // module name if provided
};

export default setupConfig;
