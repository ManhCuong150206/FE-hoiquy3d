// Lucian UX/UI Prompt #244 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#244
import { AuthSession } from '../../state/auth-session';
import { Component, DestroyRef, ElementRef, Injector, afterNextRender, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';

type FieldId = 'display-name' | 'entry-email' | 'entry-password';
interface EntryField { id:FieldId; name:string; label:string; type:string; placeholder:string; autocomplete:string; }
interface EntryIssue { id:FieldId; label:string; hint:string; }
const LOGIN_FIELDS:EntryField[] = [
  {id:'entry-email',name:'email',label:'Email',type:'email',placeholder:'ban@example.com',autocomplete:'email'},
  {id:'entry-password',name:'password',label:'Mật khẩu',type:'password',placeholder:'Nhập mật khẩu của bạn',autocomplete:'current-password'},
];
const NAME_FIELD:EntryField={id:'display-name',name:'displayName',label:'Tên hiển thị',type:'text',placeholder:'Bạn muốn được gọi là gì?',autocomplete:'nickname'};

@Component({selector:'app-entry-form',templateUrl:'./entry-form.html',styleUrl:'./entry-form.css'})
export class EntryForm {
  readonly registering=input(false);
  readonly sending=signal(false);readonly serverError=signal('');readonly showPassword=signal(false);
  private readonly auth=inject(AuthSession);
  readonly completed=output<void>();
  readonly registered=output<void>();
  readonly fields=computed(()=>this.registering()?[NAME_FIELD,...LOGIN_FIELDS]:LOGIN_FIELDS);
  readonly checked=signal(false);
  readonly issues=signal<EntryIssue[]>([]);
  private readonly form=viewChild<ElementRef<HTMLFormElement>>('form');
  private readonly injector=inject(Injector);
  private navigation=0;
  private frame=0;
  private timer=0;
  private readonly shakes=new Set<Animation>();

  constructor(){
    effect(()=>{this.registering();this.clearValidation();});
    inject(DestroyRef).onDestroy(()=>this.cancelNavigation());
  }
  invalid(id:FieldId){return this.issues().some(issue=>issue.id===id);}
  hint(id:FieldId){return this.issues().find(issue=>issue.id===id)?.hint??'';}
  private control(id:FieldId){return this.form()?.nativeElement.querySelector<HTMLInputElement>('#'+id);}
  private collect():EntryIssue[]{
    return this.fields().flatMap(field=>{
      const el=this.control(field.id);if(!el)return [];
      let hint='';
      if(field.id==='display-name'&&!el.value.trim())hint='Vui lòng nhập tên hiển thị.';
      else if(!el.value)hint=field.id==='entry-email'?'Vui lòng nhập email.':'Vui lòng nhập mật khẩu.';
      else if(el.validity.typeMismatch)hint='Email chưa đúng định dạng, ví dụ ban@example.com.';
      else if(field.id==='entry-password'&&el.value.length<8)hint='Mật khẩu cần ít nhất 8 ký tự.';
      else if(field.id==='entry-password'&&new TextEncoder().encode(el.value).byteLength>72)hint='Mật khẩu tối đa 72 byte UTF-8.';
      else if(field.id==='display-name'&&el.value.trim().length>120)hint='Tên hiển thị tối đa 120 ký tự.';
      return hint?[{id:field.id,label:field.label,hint}]:[];
    });
  }
  revalidate(){this.cancelNavigation(false);if(this.checked())this.issues.set(this.collect());}
  private cancelNavigation(cancelShakes=true){
    this.navigation++;
    if(typeof window!=='undefined'){cancelAnimationFrame(this.frame);window.clearTimeout(this.timer);}
    if(cancelShakes){this.shakes.forEach(animation=>animation.cancel());this.shakes.clear();}
  }
  private clearValidation(){this.cancelNavigation();this.checked.set(false);this.issues.set([]);this.serverError.set('');this.showPassword.set(false);}
  togglePasswordVisibility(){this.showPassword.update(visible=>!visible);}
  reset(){this.form()?.nativeElement.reset();this.clearValidation();}
  goTo(id:FieldId,event?:Event){
    event?.preventDefault();this.cancelNavigation(false);
    const el=this.control(id);if(!el)return;
    const reduced=typeof matchMedia==='undefined'||matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduced){el.scrollIntoView?.({block:'center',behavior:'instant'});el.focus({preventScroll:true});return;}
    const start=scrollY,target=Math.max(0,Math.min(document.documentElement.scrollHeight-innerHeight,el.getBoundingClientRect().top+start-100));
    const begun=performance.now(),revision=this.navigation;
    const move=(now:number)=>{
      if(revision!==this.navigation)return;
      const t=Math.min(1,(now-begun)/520),ease=1-Math.pow(1-t,3);
      window.scrollTo({top:start+(target-start)*ease,behavior:'instant'});
      if(t<1)this.frame=requestAnimationFrame(move);else el.focus({preventScroll:true});
    };
    this.frame=requestAnimationFrame(move);
  }
  async submit(event:Event){
    event.preventDefault();this.cancelNavigation();this.checked.set(true);
    const issues=this.collect();this.issues.set(issues);
    if(!issues.length){
      if(this.sending())return;this.sending.set(true);this.serverError.set('');
      const email=this.control('entry-email')?.value??'',password=this.control('entry-password')?.value??'',displayName=this.control('display-name')?.value;
      const passwordField=this.control('entry-password');if(passwordField)passwordField.value='';
      const registering=this.registering();
      try{await this.auth.enter({email,password,displayName},registering);this.reset();if(registering)this.registered.emit();else this.completed.emit();}
      catch(error){this.checked.set(false);this.serverError.set(error instanceof Error?error.message:'Không đăng nhập được.');}
      finally{this.sending.set(false);}return;
    }
    const revision=this.navigation;
    afterNextRender(()=>{
      if(revision!==this.navigation)return;
      const reduced=typeof matchMedia==='undefined'||matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(!reduced)issues.forEach(issue=>{
        const box=this.control(issue.id)?.parentElement;
        if(!box?.animate)return;
        const animation=box.animate([{transform:'translateX(0)'},{transform:'translateX(-5px)',offset:.2},{transform:'translateX(5px)',offset:.4},{transform:'translateX(-5px)',offset:.6},{transform:'translateX(5px)',offset:.8},{transform:'translateX(0)'}],{duration:400});
        this.shakes.add(animation);animation.onfinish=()=>this.shakes.delete(animation);
      });
      if(reduced)this.goTo(issues[0].id);
      else this.timer=window.setTimeout(()=>this.goTo(issues[0].id),200);
    },{injector:this.injector});
  }
}
