import { Injectable, PLATFORM_ID, inject, signal, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
export interface Identity {userId:string;displayName:string;email?:string;isAnonymous:boolean}
@Injectable({providedIn:'root'})
export class AuthSession {
 private browser=isPlatformBrowser(inject(PLATFORM_ID));
 readonly scope=signal('legacy-local');readonly user=signal<Identity|null>(null);readonly adoptFrom=signal<string|null>(null);readonly migration=signal(false);
 readonly error=signal<string|null>(null);
 constructor(){if(this.browser){const changed=(event:StorageEvent)=>{if(event.key!=='regression.identity')return;try{const user=event.newValue?JSON.parse(event.newValue) as Identity:null;this.user.set(user);this.migration.set(false);this.adoptFrom.set(null);this.scope.set(user?.userId??'legacy-local');}catch{this.user.set(null);this.scope.set('legacy-local');}};window.addEventListener('storage',changed);inject(DestroyRef).onDestroy(()=>window.removeEventListener('storage',changed));}if(this.browser)try{const value=localStorage.getItem('regression.identity');if(value){const user=JSON.parse(value) as Identity;if(typeof user.userId==='string'){this.user.set(user);this.scope.set(user.userId);}}}catch{}}
 private set(user:Identity,adopt=false){this.error.set(null);const old=this.scope();this.migration.set(adopt&&old!==user.userId&&(old==='legacy-local'||old.startsWith('offline-guest-')));this.adoptFrom.set(this.migration()?old:null);
  this.user.set(user);this.scope.set(user.userId);try{localStorage.setItem('regression.identity',JSON.stringify({userId:user.userId,displayName:user.displayName,isAnonymous:user.isAnonymous}));}catch{}return user;}
 async request(path:string,body?:object){const response=await fetch('/api/v1/auth/'+path,{method:body?'POST':'GET',credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
  const data=await response.json() as {user?:Identity|null;message?:string|string[];success?:boolean};if(!response.ok)throw new Error(typeof data.message==='string'?data.message:'Không xác thực được với máy chủ.');return data;}
 async enter(body:{email:string;password:string;displayName?:string},registering:boolean){if(!navigator.onLine)throw new Error('Cần kết nối mạng để đăng nhập hoặc đăng ký.');const data=await this.request(registering?'register':'login',body);if(!data.user)throw new Error('Máy chủ chưa xác nhận tài khoản.');return this.set(data.user);}
 async guest(){
  if(!navigator.onLine){const previous=this.user();return this.set(previous?.isAnonymous?previous:{userId:'offline-guest-'+crypto.randomUUID(),displayName:'Guest offline',isAnonymous:true},true);}
  const session=await this.request('session');const data=session.user?.isAnonymous?session:await this.request('guest',{});
  if(!data.user)throw new Error('Không tạo được phiên Guest.');return this.set(data.user,true);
 }
 async ensure(){if(!navigator.onLine)return null;const current=await this.request('session');
  if(this.scope().startsWith('offline-guest-'))return this.guest();
  if(!current.user)throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập hoặc chọn Guest lại.');
  if(current.user.userId!==this.scope())throw new Error('Phiên máy chủ đã đổi tài khoản. Hãy đăng nhập lại để đồng bộ đúng người dùng.');return current.user;}
 async logout(){if(!navigator.onLine)throw new Error('Cần có mạng để thu hồi phiên đăng nhập an toàn.');await this.request('logout',{});this.error.set(null);this.user.set(null);this.migration.set(false);this.adoptFrom.set(null);this.scope.set('legacy-local');try{localStorage.removeItem('regression.identity');}catch{}}
}
