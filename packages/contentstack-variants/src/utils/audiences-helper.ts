import { CreateExperienceInput } from '../types';

/**
 * function for substituting an old audience UID with a new one or deleting the audience information if it does not exist
 * @param audiences - {audiences} list of audience
 * @param audiencesUid - {audiencesUid} audiences mapper data in format {<old-uid>: <new-uid>}
 */
function updateAudiences(audiences: string[], audiencesUid: Record<string, string>) {
  for (let audienceIndex = audiences.length - 1; audienceIndex >= 0; audienceIndex--) {
    const audienceUid = audiences[audienceIndex];
    if (audiencesUid.hasOwnProperty(audienceUid) && audiencesUid[audienceUid]) {
      audiences[audienceIndex] = audiencesUid[audienceUid];
    } else {
      audiences.splice(audienceIndex, 1);
    }
  }
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
  // Update experience variations
  if (experience?.variations?.length) {
    for (let index = experience.variations.length - 1; index >= 0; index--) {
      const expVariations = experience.variations[index];
      if (expVariations['__type'] === 'AudienceBasedVariation' && expVariations?.audiences?.length) {
        updateAudiences(expVariations.audiences, audiencesUid);
        if (!expVariations.audiences.length) {
          experience.variations.splice(index, 1);
        }
      }
    }
  }

  // Update targeting audiences
  if (experience?.targeting?.hasOwnProperty('audience') && experience?.targeting?.audience?.audiences?.length) {
    updateAudiences(experience.targeting.audience.audiences, audiencesUid);
    if (!experience.targeting.audience.audiences.length) {
      experience.targeting = {};
    }
  }
  return experience;
};
