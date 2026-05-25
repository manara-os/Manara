import { calculateReraMaxIncrease } from '../../../../packages/shared/src';

describe('calculateReraMaxIncrease', () => {
  it('should return 0% increase when rent is within 10% of market', () => {
    expect(calculateReraMaxIncrease(10000, 10500)).toBe(0);
    expect(calculateReraMaxIncrease(10000, 10000)).toBe(0);
    expect(calculateReraMaxIncrease(10000, 10999)).toBe(0);
  });

  it('should return 5% when rent is 11-20% below market', () => {
    expect(calculateReraMaxIncrease(8200, 10000)).toBe(5);
    expect(calculateReraMaxIncrease(8000, 10000)).toBe(5);
  });

  it('should return 10% when rent is 21-30% below market', () => {
    expect(calculateReraMaxIncrease(7200, 10000)).toBe(10);
    expect(calculateReraMaxIncrease(7000, 10000)).toBe(10);
  });

  it('should return 15% when rent is 31-40% below market', () => {
    expect(calculateReraMaxIncrease(6200, 10000)).toBe(15);
    expect(calculateReraMaxIncrease(6000, 10000)).toBe(15);
  });

  it('should return 20% when rent is more than 40% below market', () => {
    expect(calculateReraMaxIncrease(5900, 10000)).toBe(20);
    expect(calculateReraMaxIncrease(4000, 10000)).toBe(20);
  });

  it('should return 0 when current rent is above market', () => {
    expect(calculateReraMaxIncrease(11000, 10000)).toBe(0);
  });
});
