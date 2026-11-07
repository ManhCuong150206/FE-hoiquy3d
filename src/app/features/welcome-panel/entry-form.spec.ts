import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthSession } from '../../state/auth-session';
import { EntryForm } from './entry-form';

describe('EntryForm validation',()=>{
 const enter=vi.fn().mockResolvedValue({userId:'test-user'});
 async function setup(registering=false){
  enter.mockResolvedValue({userId:'test-user'});
  TestBed.configureTestingModule({providers:[{provide:AuthSession,useValue:{enter}}]});
  const fixture=TestBed.createComponent(EntryForm);fixture.componentRef.setInput('registering',registering);await fixture.whenStable();
  const host=fixture.nativeElement as HTMLElement;
  const field=(id:string)=>host.querySelector<HTMLInputElement>('#'+id)!;
  const submit=()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  return {fixture,component:fixture.componentInstance,host,field,submit};
 }
 it('summarizes empty login fields and links hints with aria-describedby',async()=>{
  const {fixture,component,host,submit}=await setup();submit();await fixture.whenStable();
  expect(component.issues().map(issue=>issue.id)).toEqual(['entry-email','entry-password']);
  expect(host.querySelector('#entry-email')?.getAttribute('aria-invalid')).toBe('true');
  expect(host.querySelector('#entry-email')?.getAttribute('aria-describedby')).toBe('entry-email-error');
  expect(host.querySelectorAll('.summary-box a').length).toBe(2);
 });
 it('removes fixed fields from the summary and displays a check',async()=>{
  const {fixture,component,host,field,submit}=await setup();submit();await fixture.whenStable();
  field('entry-email').value='learner@example.com';field('entry-email').dispatchEvent(new Event('input',{bubbles:true}));await fixture.whenStable();
  expect(component.issues().map(issue=>issue.id)).toEqual(['entry-password']);
  expect(host.querySelector('.entry-field.is-good input')?.id).toBe('entry-email');
  expect(field('entry-email').hasAttribute('aria-describedby')).toBe(false);
 });
 it('rejects malformed email and short passwords without changing values',async()=>{
  const {component,field,submit}=await setup();field('entry-email').value='bad';field('entry-password').value='short';submit();
  expect(component.issues().length).toBe(2);expect(field('entry-password').value).toBe('short');
 });
 it('retains the existing 8-character rule and clears credentials before completion',async()=>{
  const {fixture,component,field,submit}=await setup();const emit=vi.spyOn(component.completed,'emit');
  field('entry-email').value='learner@example.com';field('entry-password').value='abcdefgh';submit();
  await fixture.whenStable();expect(enter).toHaveBeenCalledWith({email:'learner@example.com',password:'abcdefgh',displayName:undefined},false);expect(emit).toHaveBeenCalledOnce();expect(field('entry-password').value).toBe('');expect(component.checked()).toBe(false);
 });
 it('requires a nonblank registration name and clears stale errors on mode change',async()=>{
  const {fixture,component,field,submit}=await setup(true);field('display-name').value='   ';field('entry-email').value='learner@example.com';field('entry-password').value='abcdefgh';submit();
  expect(component.issues().map(issue=>issue.id)).toEqual(['display-name']);
  fixture.componentRef.setInput('registering',false);await fixture.whenStable();
  expect(component.issues()).toEqual([]);expect(field('entry-email').value).toBe('learner@example.com');
 });
 it('rejects passwords exceeding 72 UTF-8 bytes',async()=>{
  const {component,field,submit}=await setup();field('entry-email').value='learner@example.com';field('entry-password').value='ế'.repeat(25);submit();
  expect(component.hint('entry-password')).toContain('72 byte');
 });
 it('accepts registration display names up to 120 characters',async()=>{
  const {fixture,component,field,submit}=await setup(true);field('display-name').value='A'.repeat(120);field('entry-email').value='learner@example.com';field('entry-password').value='password123';
  const registered=vi.spyOn(component.registered,'emit');const completed=vi.spyOn(component.completed,'emit');submit();await fixture.whenStable();
  expect(registered).toHaveBeenCalledOnce();expect(completed).not.toHaveBeenCalled();
 });
});
