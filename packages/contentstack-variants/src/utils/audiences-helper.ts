import { log } from '@contentstack/cli-utilities';
import { CreateExperienceInput, CreateExperienceVersionInput } from '../types';

/**
 * function for substituting an old audience UID with a new one or deleting the audience information if it does not exist
 * @param audiences - {audiences} list of audience
 * @param audiencesUid - {audiencesUid} audiences mapper data in format {<old-uid>: <new-uid>}
 */
function updateAudiences(audiences: string[], audiencesUid: Record<string, string>) {
  log.debug(`Updating ${audiences.length} audiences`);
  
  for (let audienceIndex = audiences.length - 1; audienceIndex >= 0; audienceIndex--) {
    const audienceUid = audiences[audienceIndex];
    
    if (audiencesUid.hasOwnProperty(audienceUid) && audiencesUid[audienceUid]) {
      const newAudienceUid = audiencesUid[audienceUid];
      log.debug(`Mapping audience: ${audienceUid} -> ${newAudienceUid}`);
      audiences[audienceIndex] = newAudienceUid;
    } else {
      log.warn(`Audience not found in mapping: ${audienceUid}. Removing from list.`);
      audiences.splice(audienceIndex, 1);
    }
  }
  
  log.debug(`Updated audiences count: ${audiences.length}`);
}

/**
 * function to either modify the UID or eliminate it if the audience is not created in the target project
 * @param experience - experience object
 * @param audiencesUid - {audiencesUid} audiences mapper data in format {<old-uid>: <new-uid>}
 * @returns
 */
export const lookUpAudiences = (
  experience: CreateExperienceInput,
  audiencesUid: Record<string, string>,
): CreateExperienceInput => {
  log.debug('Starting audience lookup for experience');
  log.debug(`Available audience mappings: ${Object.keys(audiencesUid).length}`);
  
  // Update experience variations
  if (experience?.variations?.length) {
    log.debug(`Processing ${experience.variations.length} experience variations`);
    
    for (let index = experience.variations.length - 1; index >= 0; index--) {
      const expVariations = experience.variations[index];
      log.debug(`Processing variation ${index + 1}/${experience.variations.length} of type: ${expVariations['__type']}`);
      
      if (expVariations['__type'] === 'AudienceBasedVariation' && expVariations?.audiences?.length) {
        log.debug(`Found ${expVariations.audiences.length} audiences in AudienceBasedVariation`);
        updateAudiences(expVariations.audiences, audiencesUid);
        
        if (!expVariations.audiences.length) {
          log.warn('No audiences remaining after mapping. Removing variation.');
          experience.variations.splice(index, 1);
        }
      } else {
        log.debug(`Skipping variation of type: ${expVariations['__type']}`);
      }
    }
  } else if (experience.variants) {
    log.debug(`Processing ${experience.variants.length} experience variants`);
    
    for (let index = experience.variants.length - 1; index >= 0; index--) {
      const expVariations = experience.variants[index];
      log.debug(`Processing variant ${index + 1}/${experience.variants.length} of type: ${expVariations['__type']}`);
      
      if (expVariations['__type'] === 'SegmentedVariant' && expVariations?.audiences?.length) {
        log.debug(`Found ${expVariations.audiences.length} audiences in SegmentedVariant`);
        updateAudiences(expVariations.audiences, audiencesUid);
        
        if (!expVariations.audiences.length) {
          log.warn('No audiences remaining after mapping. Removing variant.');
          experience.variants.splice(index, 1);
        }
      } else {
        log.debug(`Skipping variant of type: ${expVariations['__type']}`);
      }
    }
  } else {
    log.debug('No variations or variants found in experience');
  }

  if (experience?.targeting?.hasOwnProperty('audience') && experience?.targeting?.audience?.audiences?.length) {
    log.debug(`Processing ${experience.targeting.audience.audiences.length} targeting audiences`);
    
    // Update targeting audiences
    updateAudiences(experience.targeting.audience.audiences, audiencesUid);
    
    if (!experience.targeting.audience.audiences.length) {
      log.warn('No targeting audiences remaining after mapping. Removing targeting.');
      experience.targeting = {};
    }
  } else {
    log.debug('No targeting audiences found in experience');
  }
  
  log.debug('Audience lookup completed for experience');
  return experience;
};
