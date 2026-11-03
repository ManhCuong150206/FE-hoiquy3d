import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthSession } from './auth-session';

describe('offline Guest identity',()=>{
 afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();localStorage.removeItem('regression.identity');});
 it('reuses the same offline Guest without migrating records into their own scope',async()=>{
  localStorage.removeItem('regression.identity');vi.spyOn(navigator,'onLine','get').mockReturnValue(false);
  const auth=TestBed.inject(AuthSession);const first=await auth.guest();
  expect(auth.adoptFrom()).toBe('legacy-local');auth.adoptFrom.set(null);
  const again=await auth.guest();expect(again.userId).toBe(first.userId);
  expect(auth.adoptFrom()).toBeNull();expect(auth.migration()).toBe(false);
 });
 it('adopts offline snapshots only when a new server Guest has a different identity',async()=>{
  localStorage.removeItem('regression.identity');const online=vi.spyOn(navigator,'onLine','get').mockReturnValue(false);
  const auth=TestBed.inject(AuthSession);const offline=await auth.guest();online.mockReturnValue(true);
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>new Response(JSON.stringify(url.endsWith('/session')?{user:null}:{user:{userId:'server-guest',displayName:'Guest',isAnonymous:true}}))));
  await auth.guest();expect(auth.scope()).toBe('server-guest');expect(auth.adoptFrom()).toBe(offline.userId);expect(auth.migration()).toBe(true);
 });
});
