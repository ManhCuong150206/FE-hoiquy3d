import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultsPanel } from './results-panel';

describe('ResultsPanel', () => {
  let component: ResultsPanel;
  let fixture: ComponentFixture<ResultsPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultsPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
