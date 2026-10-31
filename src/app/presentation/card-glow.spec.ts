import { approachGlow } from './card-glow';
describe('card glow fade',()=>{
 it('fades in faster than out with the reference rates',()=>{
  expect(approachGlow(0,1,16)).toBeCloseTo(.128);
  expect(approachGlow(1,0,16)).toBeCloseTo(.96);
 });
 it('clamps elapsed time after backgrounding and never overshoots',()=>{
  expect(approachGlow(0,1,5000)).toBeCloseTo(.4);
  expect(approachGlow(.3,1,-10)).toBe(.3);
  let value=0;for(let i=0;i<100;i++)value=approachGlow(value,1,16);
  expect(value).toBeLessThanOrEqual(1);expect(value).toBeGreaterThan(.99);
 });
});
