import { TestBed } from '@angular/core/testing';
import { ExperimentWorkflow } from './experiment-workflow';

describe('beginner experiment workflow', () => {
  const setup = async () => {
    const fixture = TestBed.createComponent(ExperimentWorkflow);
    const component = fixture.componentInstance;
    component.openStage(1);
    await fixture.whenStable();
    return { fixture, component, lab: component.lab, element: fixture.nativeElement as HTMLElement };
  };
  beforeEach(() => TestBed.configureTestingModule({ imports: [ExperimentWorkflow] }));

  it('offers a first run without asking a beginner to write a hypothesis', async () => {
    const { component, element } = await setup();
    expect(component.firstRun()).toBe(true);
    expect(element.textContent).toContain('Chạy cấu hình ban đầu');
    expect(element.querySelector('#trial-hypothesis')).toBeNull();
    expect(element.querySelector('#trial-question')).toBeNull();
  });

  it('keeps the baseline and allows a later trial without any question', async () => {
    const { fixture, lab, element } = await setup();
    lab.history.set([{ iteration: 1, w: [.1,.2], b: 0, trainLoss: 1, testLoss: 1 }]);
    lab.iteration.set(1); lab.status.set('paused');
    const first = lab.recordTrial()!;
    expect(first.hypothesis).toContain('Chạy cấu hình ban đầu');
    lab.setLearningRate(.03);
    await fixture.whenStable();
    const select = element.querySelector('#trial-question') as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.value).toBe('');
    lab.history.set([{ iteration: 2, w: [.2,.3], b: 0, trainLoss: .5, testLoss: .6 }]);
    lab.iteration.set(2);
    const second = lab.recordTrial()!;
    expect(second.hypothesis).toBe('');
    expect(lab.trials().find(r => r.id === first.id)?.hypothesis).toBe(first.hypothesis);
  });

  it('offers algorithm-specific questions and clears old observations when preparing a retry', async () => {
    const { fixture, component, lab, element } = await setup();
    lab.history.set([{ iteration: 1, w: [.1,.2], b: 0, trainLoss: 1, testLoss: 1 }]);
    lab.iteration.set(1); lab.status.set('paused');
    lab.hypothesis.set('Câu hỏi cũ'); lab.conclusion.set('Quan sát cũ');
    component.retry();
    expect(lab.trials()[0].conclusion).toBe('Quan sát cũ');
    expect(lab.hypothesis()).toBe(''); expect(lab.conclusion()).toBe('');
    lab.algorithm.set('ridge');
    await fixture.whenStable();
    const select = element.querySelector('#trial-question') as HTMLSelectElement;
    const question = component.questions().find(q => q.includes('λ'))!;
    select.value = question; select.dispatchEvent(new Event('change'));
    expect(lab.hypothesis()).toBe(question);
    lab.algorithm.set('polynomial');
    expect(component.questions().some(q => q.includes('bậc đa thức'))).toBe(true);
    expect(component.questions().some(q => q.includes('λ'))).toBe(false);
  });

  it('does not reuse a comparison baseline from another dataset', async () => {
    const { component, lab } = await setup();
    lab.history.set([{ iteration: 1, w: [.1,.2], b: 0, trainLoss: 1, testLoss: 1 }]); lab.iteration.set(1);
    lab.recordTrial();
    expect(component.reference()).not.toBeNull();
    lab.datasetRevision.update(v => v + 1);
    expect(component.firstRun()).toBe(true);
    expect(component.reference()).toBeNull();
  });
});
