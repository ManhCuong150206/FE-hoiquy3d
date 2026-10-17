import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrainingControls } from './training-controls';

describe('TrainingControls', () => {
  let component: TrainingControls;
  let fixture: ComponentFixture<TrainingControls>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainingControls],
    }).compileComponents();

    fixture = TestBed.createComponent(TrainingControls);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
