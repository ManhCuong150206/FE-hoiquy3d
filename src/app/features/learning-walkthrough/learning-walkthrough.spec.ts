import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LearningWalkthrough } from './learning-walkthrough';
import { LabStore } from '../../state/lab-store';

describe('lesson run and restart controls',()=>{
 async function setup(){
  TestBed.configureTestingModule({imports:[LearningWalkthrough]});
  const lab=TestBed.inject(LabStore);
  const play=vi.spyOn(lab,'playIteration').mockImplementation(()=>{});
  vi.spyOn(lab,'setMode').mockImplementation(mode=>lab.mode.set(mode));
  const fixture=TestBed.createComponent(LearningWalkthrough);fixture.componentRef.setInput('active',false);
  await fixture.whenStable();
  const button=()=>fixture.nativeElement.querySelector('.run-iteration') as HTMLButtonElement;
  return {lab,play,fixture,button};
 }
 afterEach(()=>vi.restoreAllMocks());
 it('lets a completed model restart explicitly while retaining its data and configuration',async()=>{
  const {lab,play,fixture,button}=await setup();const x=lab.trainX(),y=lab.trainY();
  lab.algorithm.set('ridge');lab.iteration.set(100);lab.status.set('done');const reset=vi.spyOn(lab,'reset');
  await fixture.whenStable();expect(button().disabled).toBe(false);expect(button().textContent).toContain('Học lại từ đầu');
  expect(fixture.nativeElement.querySelector('#lesson-run-status').textContent).toContain('100');
  button().click();await fixture.whenStable();expect(reset).toHaveBeenCalledOnce();expect(play).toHaveBeenCalledOnce();
  expect(lab.trainX()).toBe(x);expect(lab.trainY()).toBe(y);expect(lab.algorithm()).toBe('ridge');expect(lab.iteration()).toBe(0);
 });
 it('can reset an errored session in teaching mode and clears the old error',async()=>{
  const {lab,play,fixture,button}=await setup();lab.mode.set('learn');lab.status.set('error');lab.errorMsg.set('Worker error');
  await fixture.whenStable();expect(button().disabled).toBe(false);button().click();await fixture.whenStable();
  expect(lab.errorMsg()).toBeNull();expect(lab.status()).toBe('idle');expect(play).toHaveBeenCalledOnce();
 });
 it('does not reset a healthy teaching session when continuing',async()=>{
  const {lab,play,fixture,button}=await setup();lab.mode.set('learn');lab.status.set('paused');const reset=vi.spyOn(lab,'reset');
  await fixture.whenStable();button().click();await fixture.whenStable();expect(reset).not.toHaveBeenCalled();expect(play).toHaveBeenCalledOnce();
 });
 it('disables concurrent requests with a readable reason while calculating or switching modes',async()=>{
  const {lab,play,fixture,button}=await setup();lab.busy.set(true);await fixture.whenStable();
  expect(button().disabled).toBe(true);expect(fixture.nativeElement.querySelector('#lesson-run-status').textContent).toContain('Đang tính toán');
  fixture.componentInstance.runIteration();expect(play).not.toHaveBeenCalled();
  lab.busy.set(false);lab.switching.set(true);await fixture.whenStable();expect(button().disabled).toBe(true);
  expect(fixture.nativeElement.querySelector('#lesson-run-status').textContent).toContain('Đang chuyển');
 });
 it('explains why an invalid learning rate prevents playback',async()=>{
  const {lab,play,fixture,button}=await setup();lab.learningRate.set(0);await fixture.whenStable();
  expect(button().disabled).toBe(true);expect(fixture.nativeElement.querySelector('#lesson-run-status').textContent).toContain('Tốc độ học');
  fixture.componentInstance.runIteration();expect(play).not.toHaveBeenCalled();
 });
});
