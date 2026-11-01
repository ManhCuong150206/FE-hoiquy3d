import * as THREE from 'three';
import { CONTINENTS, PLANET_RADIUS, continentCenter, continentGeometry } from './planet-geometry';

describe('fictional planet terrain',()=>{
 it('creates four finite raised, distinct continents and coastline buffers',()=>{
  const fingerprints=new Set<string>();
  for(const id of CONTINENTS){
   const {land,coast,islandCount}=continentGeometry(id);expect(islandCount).toBeGreaterThanOrEqual(10);const positions=land.getAttribute('position');
   for(let i=0;i<positions.count;i++){const p=new THREE.Vector3().fromBufferAttribute(positions,i);expect(Number.isFinite(p.length())).toBe(true);expect(p.length()).toBeGreaterThan(PLANET_RADIUS);}
   expect(land.index!.count).toBeGreaterThan(1000);expect(coast.getAttribute('position').count).toBeGreaterThan(200);
   fingerprints.add(Array.from(positions.array).slice(240,260).join(','));land.dispose();coast.dispose();
  }
  expect(fingerprints.size).toBe(4);
 });
 it('keeps a reproducible atlas with continents on both hemispheres',()=>{
  const centers=CONTINENTS.map(continentCenter);expect(centers.filter(p=>p.z<0).length).toBe(2);expect(centers.filter(p=>p.z>0).length).toBe(2);
  const first=continentGeometry('ridge'),second=continentGeometry('ridge');
  expect(Array.from(first.land.getAttribute('position').array)).toEqual(Array.from(second.land.getAttribute('position').array));
  expect(Array.from(first.coast.getAttribute('position').array)).toEqual(Array.from(second.coast.getAttribute('position').array));
  [first,second].forEach(g=>{g.land.dispose();g.coast.dispose();});
 });
 it('lands on the selected terrain before the ocean, verified by raycasting',()=>{
  const ocean=new THREE.Mesh(new THREE.SphereGeometry(PLANET_RADIUS,32,24),new THREE.MeshBasicMaterial());
  const shapes=CONTINENTS.map(id=>{const geometry=continentGeometry(id);geometry.coast.dispose();const mesh=new THREE.Mesh(geometry.land,new THREE.MeshBasicMaterial());mesh.userData['algorithm']=id;return mesh;});
  for(const id of CONTINENTS){
   const center=continentCenter(id),ray=new THREE.Raycaster(center.clone().normalize().multiplyScalar(6),center.clone().normalize().negate());
   [ocean,...shapes].forEach(mesh=>mesh.updateMatrixWorld(true));
   expect(ray.intersectObjects([ocean,...shapes])[0]?.object.userData['algorithm']).toBe(id);
  }
  [ocean,...shapes].forEach(mesh=>{mesh.geometry.dispose();mesh.material.dispose();});
 });
});
