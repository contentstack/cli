import { log } from '@contentstack/cli-utilities';
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
  log.debug('Starting event lookup for experience');
  log.debug(`Available event mappings: ${Object.keys(eventsUid).length}`);
  
  // Update events uid in experience metrics
  if (experience?.metrics?.length) {
    log.debug(`Processing ${experience.metrics.length} experience metrics`);
    
    for (let metricIndex = experience?.metrics?.length - 1; metricIndex >= 0; metricIndex--) {
      const metric: ExpMetric = experience?.metrics[metricIndex];
      const eventUid = metric.event;
      
      log.debug(`Processing metric ${metricIndex + 1}/${experience.metrics.length} with event: ${eventUid}`);
      
      if (eventsUid.hasOwnProperty(eventUid) && eventsUid[eventUid]) {
        const newEventUid = eventsUid[eventUid];
        log.debug(`Mapping event: ${eventUid} -> ${newEventUid}`);
        experience.metrics[metricIndex].event = newEventUid;
      } else {
        log.warn(`Event not found in mapping: ${eventUid}. Removing metric.`);
        experience?.metrics.splice(metricIndex, 1);
      }
    }
    
    log.debug(`Final metrics count: ${experience.metrics.length}`);
  } else {
    log.debug('No metrics found in experience');
  }
  
  log.debug('Event lookup completed for experience');
  return experience;
};
