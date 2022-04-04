import axios from 'axios';
import * as querystring from 'querystring';

const VERSION = 1;
/**
 * Using Google Analytics Measurement Protocol to track usage by users.
 * The Google Analytics Measurement Protocol allows developers to make HTTP
 * requests to send raw user interaction data directly to Google Analytics servers.
 * This allows developers to measure how users interact with their business from almost
 * any environment.
 * See more about google analytics Measurement Protocol here: https://developers.google.com/analytics/devguides/collection/protocol/v1
 */
const GOOGLE_ANALYTICS_MEASUREMENT_PROTOCOL_URL = 'http://www.google-analytics.com/collect';

/**
 * Represents analytics for CLI
 */
export default class Analytics {
  private settings: { v: number; tid: string; cid: string };

  constructor(options: { trackingID: string; cid: string }) {
    this.settings = {
      v: VERSION,
      tid: options.trackingID,
      cid: options.cid,
    };
  }

  /**
   *
   * e.g data sent to google analytics Measurement protocol will look like
   * {
   *   t: 'event',
   *   ec: '@contentstack/contentstack-import',
   *   ea: 'cm:import',
   *   el: '0.1.0',
   *   cd1: '@contentstack/cli/0.0.0 linux-x64 node-v12.13.1',
   * }
   * @param {string} action Command ran by user.
   * @param {object} analyticsOpts Contains label and os key, label represents plugin version and os represents machine details as user-agent.
   * @returns {promises} Contains response from http client.
   */
  async track(action: string, analyticsOpts: { category: string; label: string; os: string }): Promise<any> {
    const data = {
      t: 'event',
      ec: analyticsOpts.category,
      ea: action,
      el: analyticsOpts.label,
      cd1: analyticsOpts.os,
    };
    const opts = Object.assign(data, this.settings);
    return axios.post(GOOGLE_ANALYTICS_MEASUREMENT_PROTOCOL_URL, querystring.stringify(opts));
  }
}
