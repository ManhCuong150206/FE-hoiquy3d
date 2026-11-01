import { vi } from 'vitest';
import { curvedFlight, closePlanetCinema } from './algorithm-flight';
import { sectorCenter } from '../features/algorithm-sphere/algorithm-sphere';
describe('algorithm flight geometry',()=>{
 it('can clean up during SSR without a browser document',()=>{
  vi.stubGlobal('document',undefined);
  try{expect(()=>closePlanetCinema()).not.toThrow();}finally{vi.unstubAllGlobals();}
 });
 it('uses the exact launch/landing positions on a finite curved path',()=>{
  const a={x:100,y:700},b={x:800,y:250};
  expect(curvedFlight(a,b,0)).toEqual(a);expect(curvedFlight(a,b,1)).toEqual(b);
  for(let i=0;i<=20;i++){const p=curvedFlight(a,b,i/20);expect(Number.isFinite(p.x)&&Number.isFinite(p.y)).toBe(true);}
 });
 it('assigns four distinct landing points on raised terrain',()=>{
  const points=(['linear','polynomial','ridge','lasso'] as const).map(sectorCenter);
  for(const p of points)expect(p.length()).toBeCloseTo(1.665);
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)expect(points[i].distanceTo(points[j])).toBeGreaterThan(.9);
 });
});
