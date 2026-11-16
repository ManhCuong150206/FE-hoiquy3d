import { TestBed } from '@angular/core/testing';
import { LearningRoute, scrollEase, followTarget } from './learning-route';

describe('LearningRoute', () => {
  it('keeps all explanations readable and learning phase independent from reading', async () => {
    await TestBed.configureTestingModule({imports:[LearningRoute]}).compileComponents();
    const fixture=TestBed.createComponent(LearningRoute);
    fixture.componentRef.setInput('active',false);
    fixture.componentRef.setInput('phase',1);
    fixture.detectChanges();
    fixture.componentInstance.progress.set(1);fixture.detectChanges();
    const el:HTMLElement=fixture.nativeElement;
    expect(el.querySelectorAll('li').length).toBe(6);
    expect(el.querySelectorAll('li.read').length).toBe(6);
    expect(el.querySelector('[aria-current="step"]')?.textContent).toContain('B · Dự đoán');
    expect(fixture.componentInstance.phase()).toBe(1);
    fixture.componentRef.setInput('phase',null);fixture.detectChanges();
    expect(el.querySelector('.actual')?.textContent).toContain('A · Đầu vào');
    fixture.destroy();
  });
  it('opens only one stage and never changes actual phase when browsing', async () => {
    await TestBed.configureTestingModule({imports:[LearningRoute]}).compileComponents();
    const fixture=TestBed.createComponent(LearningRoute);
    fixture.componentRef.setInput('active',false);
    fixture.componentRef.setInput('phase',2);fixture.detectChanges();
    const el:HTMLElement=fixture.nativeElement;
    const buttons=el.querySelectorAll<HTMLButtonElement>('.stage-toggle');
    buttons[0].click();fixture.detectChanges();
    expect(el.querySelectorAll('.stage-result').length).toBe(1);
    expect(buttons[0].getAttribute('aria-expanded')).toBe('true');
    expect(fixture.componentInstance.phase()).toBe(2);
    buttons[5].click();fixture.detectChanges();
    expect(el.querySelectorAll('.stage-result').length).toBe(1);
    expect(buttons[0].getAttribute('aria-expanded')).toBe('false');
    expect(fixture.componentInstance.phase()).toBe(2);
    buttons[5].click();fixture.detectChanges();
    expect(el.querySelectorAll('.stage-result').length).toBe(0);
    fixture.componentRef.setInput('phase',3);fixture.detectChanges();
    expect(fixture.componentInstance.selected()).toBe(3);
    fixture.destroy();
  });

  it('eases scroll continuously with finite clamped endpoints', () => {
    expect(scrollEase(-1)).toBe(0);expect(scrollEase(0)).toBe(0);
    expect(scrollEase(1)).toBe(1);expect(scrollEase(2)).toBe(1);
    let previous=0;
    for(let i=1;i<=100;i++){const next=scrollEase(i/100);expect(next).toBeGreaterThanOrEqual(previous);expect(next-previous).toBeLessThan(.031);previous=next;}
  });

  it('does not scroll a stage that is already fully readable', () => {
    expect(followTarget(200,120,180,700,1800)).toBeNull();
    expect(followTarget(200,620,180,700,1800)).toBeGreaterThan(200);
    expect(followTarget(200,30,180,700,1800)).toBeLessThan(200);
  });
  it('keeps playback compact and opens full results only after it stops', async () => {
    await TestBed.configureTestingModule({imports:[LearningRoute]}).compileComponents();
    const f=TestBed.createComponent(LearningRoute);f.componentRef.setInput('active',false);
    f.componentRef.setInput('locked',true);f.componentRef.setInput('phase',2);f.componentRef.setInput('summaries',['input','prediction','residual']);f.detectChanges();
    const el:HTMLElement=f.nativeElement;
    expect(el.querySelectorAll('.phase-summary')).toHaveLength(6);
    expect(el.querySelectorAll('.stage-result')).toHaveLength(0);
    expect(el.querySelectorAll('.phase-summary')[2].textContent).toContain('residual');
    expect(el.querySelectorAll('.phase-summary')[5].textContent).not.toContain('residual');
    f.componentRef.setInput('locked',false);f.detectChanges();
    expect(el.querySelectorAll('.stage-result')).toHaveLength(1);f.destroy();
  });

});
