import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExperimentsPanel } from './experiments-panel';

describe('ExperimentsPanel', () => {
  let component: ExperimentsPanel;
  let fixture: ComponentFixture<ExperimentsPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExperimentsPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(ExperimentsPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
