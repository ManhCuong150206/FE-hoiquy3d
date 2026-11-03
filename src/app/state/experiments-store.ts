import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, effect, inject, signal, untracked, DestroyRef } from '@angular/core';
import { ALGORITHM_LABELS, SavedExperiment } from '../core/models/experiment';
import { experimentDb } from '../core/storage/experiment-db';
import { LabStore } from './lab-store';
import { AuthSession } from './auth-session';
const SYNC_URL='/api/v1/experiments/bulk';
function newId(){return globalThis.crypto?.randomUUID?.()??`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;}
function fromServer(value:unknown,scopeId:string):SavedExperiment|null{
 if(!value||typeof value!=='object')return null;const r=value as Record<string,unknown>;
 const type=typeof r['algorithm']==='string'?r['algorithm']:(r['algorithm'] as {type?:string})?.type;
 if(typeof r['clientId']!=='string'||!['linear','polynomial','ridge','lasso'].includes(type??''))return null;
 if(!r['deletedAt']&&(!Array.isArray(r['w'])||!r['train']||!r['test']||!r['dataSource']))return null;
 const date=r['clientCreatedAt']??new Date(String(r['createdAt'])).getTime();
 const result={...r,id:r['clientId'],algorithm:type,createdAt:date,scopeId,synced:true,
  serverVersion:r['syncVersion'],mutationId:r['lastMutationId'],deletedAt:r['deletedAt']?new Date(String(r['deletedAt'])).getTime():undefined} as unknown as SavedExperiment;
 for(const key of ['train','test']as const)if(result[key]?.r2===null)result[key]={...result[key],r2:NaN};
 return result;
}
@Injectable({providedIn:'root'})
export class ExperimentsStore {
 private isBrowser=isPlatformBrowser(inject(PLATFORM_ID));private lab=inject(LabStore);private auth=inject(AuthSession);
 private all=signal<SavedExperiment[]>([]);list=computed(()=>this.all().filter(e=>!e.deletedAt));
 online=signal(true);syncing=signal(false);syncError=signal<string|null>(null);
 conflict=signal<{id:string;server:SavedExperiment|null}|null>(null);
 pendingCount=computed(()=>this.all().filter(e=>!e.synced).length);canSave=computed(()=>this.lab.latest()!==null);
 private syncAgain=false;
 private loadedScope='';private revision=0;private scopeLoad:Promise<void>=Promise.resolve();private writes=Promise.resolve();
 constructor(){
  effect(()=>{this.auth.scope();if(this.isBrowser)untracked(()=>{this.scopeLoad=this.loadScope();});});
  if(!this.isBrowser)return;this.online.set(navigator.onLine);
  const on=()=>{this.online.set(true);void this.sync();},off=()=>this.online.set(false);
  window.addEventListener('online',on);window.addEventListener('offline',off);
  inject(DestroyRef).onDestroy(()=>{window.removeEventListener('online',on);window.removeEventListener('offline',off);});
 }
 private persist(){const records=this.all();this.writes=this.writes.catch(()=>{}).then(()=>experimentDb.putMany(records));return this.writes;}
 private async loadScope(){const scope=this.auth.scope(),rev=++this.revision;this.loadedScope='';this.all.set([]);this.conflict.set(null);
  try{const stored=await experimentDb.all();if(rev!==this.revision)return;
   const adopt=this.auth.adoptFrom();const records=stored.filter(e=>e.scopeId===scope);
   const adoptedIds:string[]=[];
   if(adopt)for(const e of stored)if(e.scopeId===adopt||!e.scopeId&&adopt==='legacy-local'){records.push({...e,id:adopt==='legacy-local'?newId():e.id,scopeId:scope,serverVersion:0,mutationId:newId(),synced:false});if(adopt==='legacy-local')adoptedIds.push(e.id);}
   this.all.set(records.sort((a,c)=>c.createdAt-a.createdAt));this.loadedScope=scope;await this.persist();for(const id of adoptedIds)await experimentDb.remove(id);this.auth.adoptFrom.set(null);
  }catch{if(rev===this.revision){this.loadedScope=scope;this.syncError.set('Không truy cập được IndexedDB. Dữ liệu mới chỉ giữ trong bộ nhớ.');}}
  if(rev===this.revision&&this.auth.user())void this.sync();
 }
 save(name:string):SavedExperiment|null{
  const state=this.lab.latest(),metrics=this.lab.metrics();if(!state||!metrics)return null;
  if(this.loadedScope!==this.auth.scope()){this.syncError.set('Đang mở vùng dữ liệu. Vui lòng thử lưu lại.');return null;}
  const exp:SavedExperiment={id:newId(),scopeId:this.auth.scope(),mutationId:newId(),serverVersion:0,
   name:name.trim()||`${ALGORITHM_LABELS[this.lab.algorithm()]} #${this.list().length+1}`,createdAt:Date.now(),
   algorithm:this.lab.algorithm(),learningRate:this.lab.learningRate(),maxIterations:this.lab.maxIterations(),
   degree:this.lab.algorithm()==='polynomial'?this.lab.degree():undefined,lambda:['ridge','lasso'].includes(this.lab.algorithm())?this.lab.lambda():undefined,
   dataSource:this.lab.dataSource(),csvName:this.lab.csvName(),synthetic:this.lab.appliedSynthetic()??undefined,
   sampleCount:this.lab.trainX().length+this.lab.testX().length,featureCount:this.lab.dataFeatures(),
   noise:this.lab.appliedSynthetic()?.noise??this.lab.noise(),seed:this.lab.appliedSynthetic()?.seed??this.lab.seed(),trainRatio:this.lab.appliedSynthetic()?.trainRatio??this.lab.trainRatio(),
   iterations:state.iteration,w:[...state.w],b:state.b,train:metrics.train,test:metrics.test,synced:false,
   csvData:this.lab.dataSource()==='csv'?structuredClone({trainX:this.lab.trainX(),trainY:this.lab.trainY(),testX:this.lab.testX(),testY:this.lab.testY(),trainIndices:this.lab.trainIndices(),provenance:this.lab.provenance()??undefined}):undefined};
  if(exp.name.length>120){this.syncError.set('Tên thí nghiệm tối đa 120 ký tự.');return null;}
  if(new TextEncoder().encode(JSON.stringify(exp)).byteLength>8*1024*1024){this.syncError.set('Bản lưu vượt 8 MiB. Hãy giảm dữ liệu CSV trước khi lưu; mô hình đang chạy được giữ nguyên.');return null;}
  this.all.update(list=>[exp,...list]);void this.persist().catch(()=>this.syncError.set('Không lưu được xuống IndexedDB; dữ liệu hiện chỉ ở bộ nhớ.'));
  void this.sync();return exp;
 }
 remove(id:string){this.all.update(list=>list.map(e=>e.id===id?{...e,deletedAt:Date.now(),synced:false,mutationId:newId()}:e));void this.persist().catch(()=>{});void this.sync();}
 private async readRemote(scope:string){const records:SavedExperiment[]=[];let page=1,totalPages=1;
  do{const res=await fetch(`/api/v1/experiments?includeDeleted=true&page=${page}&limit=100`,{credentials:'same-origin',cache:'no-store',headers:{'X-Expected-User':scope}});if(!res.ok)throw new Error('Không đọc được thí nghiệm từ máy chủ.');
   const data=await res.json() as {items:unknown[];totalPages:number};if(!Array.isArray(data.items)||!Number.isFinite(data.totalPages))throw new Error('Phản hồi danh sách không hợp lệ.');
   for(const value of data.items){const record=fromServer(value,scope);if(record)records.push(record);}totalPages=data.totalPages;page++;
  }while(page<=totalPages);return records;
 }
 async resolveConflict(copy:boolean){const conflict=this.conflict();if(!conflict)return;const local=this.all().find(e=>e.id===conflict.id);if(!local)return;
  const remote=conflict.server;this.all.update(list=>list.filter(e=>e.id!==local.id).concat(remote?[remote]:[],copy?[{...local,id:newId(),mutationId:newId(),serverVersion:0,synced:false,deletedAt:undefined,name:local.name.slice(0,109)+' (bản sao)'}]:[]));
  await experimentDb.remove(local.id).catch(()=>{});await this.persist();this.conflict.set(null);void this.sync();
 }
 async sync(){
  if(!this.isBrowser||!this.online()||!this.auth.user()||this.conflict())return;
  if(this.syncing()){this.syncAgain=true;return;}
  this.syncing.set(true);this.syncError.set(null);let scope=this.auth.scope();
  try{await this.auth.ensure();scope=this.auth.scope();
   // A scope effect can supersede an in-flight load. Wait for the latest load,
   // not a stale promise that resolved before Guest records were adopted.
   while(true){const loading=this.scopeLoad;await loading;await this.writes;if(scope!==this.auth.scope())return;
    if(loading!==this.scopeLoad)continue;if(this.loadedScope===scope)break;this.scopeLoad=this.loadScope();}

   while(true){if(scope!==this.auth.scope())return;const pending=this.all().filter(e=>!e.synced);if(!pending.length)break;
    const batch:SavedExperiment[]=[];let bytes=0;for(const item of pending){const size=new TextEncoder().encode(JSON.stringify(item)).byteLength;if(batch.length&&(bytes+size>8*1024*1024||batch.length>=50))break;batch.push(item);bytes+=size;}
    const payload=batch.map(({synced,scopeId,...rest})=>rest.deletedAt?{id:rest.id,deletedAt:rest.deletedAt,mutationId:rest.mutationId,serverVersion:rest.serverVersion}:rest);
    const res=await fetch(SYNC_URL,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Expected-User':scope},body:JSON.stringify(payload)});
    const ack=await res.json() as {success?:boolean;items?:{id:string;mutationId:string;syncVersion:number}[];id?:string;message?:string};
    if(!res.ok){if(res.status===409&&ack.id){const remote=await this.readRemote(scope);this.conflict.set({id:ack.id,server:remote.find(e=>e.id===ack.id)??null});}throw new Error(ack.message??`Đồng bộ thất bại (HTTP ${res.status}).`);}
    if(!ack.success||!Array.isArray(ack.items)||batch.some(e=>!ack.items!.some(a=>a.id===e.id&&a.mutationId===(e.mutationId??e.id)&&Number.isInteger(a.syncVersion)&&a.syncVersion>0)))throw new Error('Máy chủ chưa xác nhận đủ từng thí nghiệm. Dữ liệu còn chờ đồng bộ.');
    if(scope!==this.auth.scope())return;
    this.all.update(list=>list.map(e=>{const a=ack.items!.find(a=>a.id===e.id&&a.mutationId===(e.mutationId??e.id));return a?{...e,synced:true,serverVersion:a.syncVersion}:e;}));await this.persist();
   }
   const remote=await this.readRemote(scope);if(scope!==this.auth.scope())return;
   this.all.update(list=>{const merged=new Map(list.map(e=>[e.id,e]));for(const record of remote){const local=merged.get(record.id);if(!local||local.synced&&(record.serverVersion??0)>=(local.serverVersion??0))merged.set(record.id,record);}return [...merged.values()].sort((a,b)=>b.createdAt-a.createdAt);});await this.persist();
  }catch(error){this.syncError.set(error instanceof Error?error.message:'Chưa đồng bộ được. Dữ liệu vẫn được giữ cục bộ.');}
  finally{this.syncing.set(false);if(this.syncAgain){this.syncAgain=false;void this.sync();}}
 }
    // ===== xuất =====
    exportJson() {
        this.download('hoiquy3d-experiments.json', JSON.stringify(this.list(), null, 2), 'application/json');
    }

    exportCsv() {
        const cols = [
            'id', 'name', 'createdAt', 'algorithm', 'learningRate', 'maxIterations', 'degree', 'lambda', 'iterations',
            'dataSource', 'csvName', 'sampleCount', 'featureCount', 'noise', 'seed', 'trainRatio',
            'synthetic_kind', 'synthetic_version', 'w', 'b',
            'train_mse', 'train_rmse', 'train_mae', 'train_r2',
            'test_mse', 'test_rmse', 'test_mae', 'test_r2',
        ];
        const esc = (v: unknown) => {
            const s = String(v ?? '');
            return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const lines = this.list().map((e) => [
            e.id, e.name, new Date(e.createdAt).toISOString(), e.algorithm, e.learningRate, e.maxIterations, e.degree ?? '', e.lambda ?? '', e.iterations,
            e.dataSource, e.csvName, e.sampleCount, e.featureCount, e.noise, e.seed, e.trainRatio,
            e.synthetic?.kind ?? (e.dataSource === 'synthetic' ? 'linear' : ''), e.synthetic?.version ?? '',
            e.w.join(' '), e.b,
            e.train.mse, e.train.rmse, e.train.mae, e.train.r2,
            e.test.mse, e.test.rmse, e.test.mae, e.test.r2,
        ].map(esc).join(','));
        // BOM để Excel đọc đúng tiếng Việt
        this.download('hoiquy3d-experiments.csv', '\uFEFF' + [cols.join(','), ...lines].join('\r\n'), 'text/csv;charset=utf-8');
    }

    // ===== nội bộ =====
    private download(filename: string, content: string, mime: string) {
        if (!this.isBrowser) return;
        const url = URL.createObjectURL(new Blob([content], { type: mime }));
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}