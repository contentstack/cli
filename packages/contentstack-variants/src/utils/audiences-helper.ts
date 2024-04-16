import { CreateExperienceInput } from '../types';

/**
 * function to replace old audience uid with new one OR delete the audience details if not exists
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
 * Lookup function to either update uid or remove it if audience not created in target project
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
    experience.variations.forEach((variation) => {
      if (variation['__type'] === 'AudienceBasedVariation' && variation?.audiences?.length) {
        updateAudiences(variation.audiences, audiencesUid);
      }
    });
  }

  // Update targeting audiences
  if (experience?.targeting?.hasOwnProperty('audience') && experience.targeting.audience.audiences?.length) {
    updateAudiences(experience.targeting.audience.audiences, audiencesUid);
  }
  return experience;
};
