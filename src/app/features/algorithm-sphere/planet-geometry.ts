import * as THREE from 'three';
import { unitRotation } from '../../core/engine/complex-rotation';
import { Algorithm } from '../../core/models/experiment';

export const PLANET_RADIUS=1.58;
export const PLANET_SEED=81427;
export const CONTINENTS:Algorithm[]=['linear','polynomial','ridge','lasso'];
// A fixed fictional atlas. Longitudes span the entire world, not four front quadrants.
const atlas:Record<Algorithm,{longitude:number;latitude:number;scale:number;outline:number[][]}>={
 linear:{longitude:-40,latitude:22,scale:.75,outline:[[-.85,.43],[-.61,.78],[-.32,.84],[-.17,.62],[.1,.73],[.32,.51],[.62,.49],[.72,.23],[.5,.08],[.61,-.1],[.31,-.27],[.24,-.61],[.04,-.96],[-.17,-.79],[-.23,-.5],[-.52,-.34],[-.76,-.39],[-.92,-.08],[-.65,.09],[-.9,.21]]},
 polynomial:{longitude:49,latitude:19,scale:.82,outline:[[-.98,.21],[-.77,.53],[-.47,.46],[-.39,.76],[-.02,.81],[.19,.63],[.52,.72],[.94,.45],[1,.11],[.72,.05],[.82,-.25],[.58,-.49],[.42,-.35],[.27,-.74],[.07,-.6],[-.03,-.28],[-.34,-.47],[-.59,-.34],[-.52,-.02],[-.85,-.06]]},
 ridge:{longitude:151,latitude:-13,scale:.70,outline:[[-.7,.76],[-.36,.88],[-.16,.55],[.12,.63],[.38,.41],[.69,.45],[.83,.09],[.49,-.13],[.61,-.48],[.31,-.82],[.03,-.91],[-.17,-.67],[-.25,-.36],[-.57,-.48],[-.7,-.17],[-.51,.12],[-.88,.32]]},
 lasso:{longitude:-127,latitude:-27,scale:.73,outline:[[-.9,.31],[-.68,.67],[-.28,.61],[-.08,.85],[.23,.75],[.35,.43],[.72,.37],[.88,.01],[.64,-.14],[.83,-.37],[.48,-.64],[.17,-.55],[-.03,-.81],[-.36,-.68],[-.41,-.38],[-.77,-.4],[-.68,-.13],[-.98,.02]]},
};
function random(seed:number){let state=seed;return()=>{state=state*16807%2147483647;return state/2147483647;};}
export function continentCenter(id:Algorithm):THREE.Vector3{
 const entry=atlas[id],lon=unitRotation(entry.longitude*Math.PI/180),lat=unitRotation(entry.latitude*Math.PI/180);
 return new THREE.Vector3(lon.imaginary*lat.real,lat.imaginary,lon.real*lat.real).multiplyScalar(PLANET_RADIUS+.085);
}
function inside(point:THREE.Vector2,polygon:THREE.Vector2[]){
 let result=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[i],b=polygon[j];if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)result=!result;
 }return result;
}
export function continentGeometry(id:Algorithm):{land:THREE.BufferGeometry;coast:THREE.BufferGeometry;islandCount:number}{
 const entry=atlas[id],n=continentCenter(id).normalize(),u=new THREE.Vector3(0,1,0).cross(n).normalize(),v=n.clone().cross(u).normalize();
 const rng=random(PLANET_SEED+CONTINENTS.indexOf(id)*137);
 const contour:THREE.Vector2[]=[];
 entry.outline.forEach((a,i)=>{
  const b=entry.outline[(i+1)%entry.outline.length];
  for(let j=0;j<6;j++){const t=j/6,rough=j===0?0:(rng()-.5)*.06;
   contour.push(new THREE.Vector2((a[0]+(b[0]-a[0])*t+rough)*entry.scale,(a[1]+(b[1]-a[1])*t-rough*.7)*entry.scale));
  }
 });
 const polygons=[contour];
 // Dense, fixed archipelagos. Keep water between islands and neighboring regions.
 const otherNormals=CONTINENTS.filter(other=>other!==id).map(other=>continentCenter(other).normalize());
 const distanceToCoast=(point:THREE.Vector2)=>Math.min(...contour.map((a,i)=>{
  const b=contour[(i+1)%contour.length],ab=b.clone().sub(a),t=THREE.MathUtils.clamp(point.clone().sub(a).dot(ab)/Math.max(ab.lengthSq(),1e-8),0,1);
  return point.distanceTo(a.clone().addScaledVector(ab,t));
 }));
 const islandCenters:{point:THREE.Vector2;radius:number}[]=[];
 for(let attempt=0;attempt<600&&islandCenters.length<14;attempt++){
  const anchor=contour[Math.floor(rng()*contour.length)],outward=anchor.clone().normalize();
  const radius=.032+rng()*.033,point=anchor.clone().addScaledVector(outward,.09+rng()*.17).add(new THREE.Vector2((rng()-.5)*.12,(rng()-.5)*.12));
  const direction=n.clone().addScaledVector(u,point.x).addScaledVector(v,point.y).normalize();
  if(Math.abs(point.x)+radius>1.18||Math.abs(point.y)+radius>1.18||inside(point,contour)||distanceToCoast(point)<radius+.018||otherNormals.some(other=>direction.dot(n)-direction.dot(other)<.07)||islandCenters.some(other=>other.point.distanceTo(point)<other.radius+radius+.024))continue;
  islandCenters.push({point,radius});const island:THREE.Vector2[]=[];
  for(let j=0;j<20;j++){const turn=unitRotation(j/20*Math.PI*2),r=radius*(.78+rng()*.32);island.push(new THREE.Vector2(point.x+turn.real*r,point.y+turn.imaginary*r));}polygons.push(island);
 }
 const positions:number[]=[],colors:number[]=[],indices:number[]=[],shore:number[]=[];
 const elevation=(x:number,y:number)=>{
  const mountain=(cx:number,cy:number,r:number)=>Math.max(0,1-((x-cx)**2+(y-cy)**2)/(r*r))**2;
  return .018+.067*Math.exp(-2.5*(x*x+y*y))+.035*mountain(.16,.12,.12)+.023*mountain(-.14,-.11,.1);
 };
 const world=(x:number,y:number)=>n.clone().addScaledVector(u,x).addScaledVector(v,y).normalize().multiplyScalar(PLANET_RADIUS+elevation(x,y));
 // Uniform triangulation avoids the radial/petal pattern of the old disk mesh.
 const steps=100,extent=1.2,spacing=extent*2/steps;
 for(let y=0;y<=steps;y++)for(let x=0;x<=steps;x++){
  const px=-extent+x*spacing,py=-extent+y*spacing,p=world(px,py);positions.push(p.x,p.y,p.z);
  const grain=((x*29+y*17+CONTINENTS.indexOf(id)*11)%19)/19;
  const shade=.3+grain*.13+elevation(px,py)*1.7;colors.push(shade,shade,shade);
 }
 const boxes=polygons.map(polygon=>({polygon,minX:Math.min(...polygon.map(p=>p.x)),maxX:Math.max(...polygon.map(p=>p.x)),minY:Math.min(...polygon.map(p=>p.y)),maxY:Math.max(...polygon.map(p=>p.y))}));
 const inLand=(x:number,y:number)=>boxes.some(box=>x>=box.minX&&x<=box.maxX&&y>=box.minY&&y<=box.maxY&&inside(new THREE.Vector2(x,y),box.polygon));
 const mask=Array.from({length:(steps+1)**2},(_,i)=>inLand(-extent+(i%(steps+1))*spacing,-extent+Math.floor(i/(steps+1))*spacing));
 for(let y=0;y<steps;y++)for(let x=0;x<steps;x++){
  const a=y*(steps+1)+x,b=a+1,c=a+steps+1,d=c+1;
  if(mask[a]&&mask[b]&&mask[c])indices.push(a,b,c);
  if(mask[b]&&mask[d]&&mask[c])indices.push(b,d,c);
 }
 for(const polygon of polygons)polygon.forEach((point,i)=>{
  const next=polygon[(i+1)%polygon.length],a=world(point.x,point.y).multiplyScalar(1.0015),b=world(next.x,next.y).multiplyScalar(1.0015);shore.push(a.x,a.y,a.z,b.x,b.y,b.z);
 });
 const land=new THREE.BufferGeometry();land.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));land.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));land.setIndex(indices);land.computeVertexNormals();land.computeBoundingSphere();
 const coast=new THREE.BufferGeometry();coast.setAttribute('position',new THREE.Float32BufferAttribute(shore,3));return {land,coast,islandCount:islandCenters.length};
}
