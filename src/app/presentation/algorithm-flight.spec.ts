import { vi } from 'vitest';
import { curvedFlight, viewportRadius, removeFlightCover } from './algorithm-flight';
import { sectorCenter } from '../features/algorithm-sphere/algorithm-sphere';
describe('algorithm flight geometry',()=>{
 it('can clean up during SSR without a browser document',()=>{
  vi.stubGlobal('document',undefined);
  try{expect(()=>removeFlightCover()).not.toThrow();}finally{vi.unstubAllGlobals();}
 });
 it('uses the exact launch/landing positions on a finite curved path',()=>{
  const a={x:100,y:700},b={x:800,y:250};
  expect(curvedFlight(a,b,0)).toEqual(a);expect(curvedFlight(a,b,1)).toEqual(b);
  for(let i=0;i<=20;i++){const p=curvedFlight(a,b,i/20);expect(Number.isFinite(p.x)&&Number.isFinite(p.y)).toBe(true);}
 });
 it('covers every viewport corner for centered and off-screen anchors',()=>{
  for(const point of [{x:720,y:500},{x:-30,y:300},{x:1300,y:20}]){
   for(const [w,h] of [[1440,1000],[390,844],[768,900]]){
    const radius=viewportRadius(point,w,h);
    for(const corner of [{x:0,y:0},{x:w,y:0},{x:0,y:h},{x:w,y:h}])expect(radius).toBeGreaterThan(Math.hypot(corner.x-point.x,corner.y-point.y));
   }
  }
 });
 it('assigns four distinct sphere-sector midpoints at the actual radius',()=>{
  const points=(['linear','polynomial','ridge','lasso'] as const).map(sectorCenter);
  for(const p of points)expect(p.length()).toBeCloseTo(1.58);
  expect(points[0].dot(points[1])).toBeCloseTo(0);expect(points[0].dot(points[2])).toBeLessThan(0);
 });
});
