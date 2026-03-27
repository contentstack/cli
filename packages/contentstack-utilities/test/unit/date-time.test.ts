import { expect } from 'chai';
import { formatDate, formatTime } from '../../src/date-time';

describe('date-time', () => {
  describe('formatDate', () => {
    it('should format date as YYYYMMDD', () => {
      const d = new Date(2025, 0, 15); // Jan 15, 2025
      expect(formatDate(d)).to.equal('20250115');
    });

    it('should pad month and day with zero', () => {
      const d = new Date(2025, 0, 5); // Jan 5, 2025
      expect(formatDate(d)).to.equal('20250105');
    });
  });

  describe('formatTime', () => {
    it('should format time as HHMMSS', () => {
      const d = new Date(2025, 0, 1, 9, 5, 3);
      expect(formatTime(d)).to.equal('090503');
    });

    it('should pad hours, minutes, seconds with zero', () => {
      const d = new Date(2025, 0, 1, 0, 0, 0);
      expect(formatTime(d)).to.equal('000000');
    });
  });
});
