import { CreateExperienceInput, ExpMetric } from '../types';

/**
 * function to either modify the UID or eliminate it if the event is not created in the target project
 * @param experience - experience object 
 * @param eventsUid - {eventsUid} events mapper data in format {<old-uid>: <new-uid>}
 * @returns
 */
export const lookUpEvents = (
  experience: CreateExperienceInput,
  eventsUid: Record<string, string>,
): CreateExperienceInput => {
  // Update events uid in experience metrics
  if (experience?.metrics?.length) {
    for (let metricIndex = experience?.metrics?.length - 1; metricIndex >= 0; metricIndex--) {
      const metric: ExpMetric = experience?.metrics[metricIndex];
      const eventUid = metric.event;
      if (eventsUid.hasOwnProperty(eventUid) && eventsUid[eventUid]) {
        experience.metrics[metricIndex].event = eventsUid[eventUid];
      } else {
        experience?.metrics.splice(metricIndex, 1);
      }
    }
  }
  return experience;
};
