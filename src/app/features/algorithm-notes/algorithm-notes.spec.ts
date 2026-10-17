import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlgorithmNotes } from './algorithm-notes';

describe('AlgorithmNotes', () => {
  let component: AlgorithmNotes;
  let fixture: ComponentFixture<AlgorithmNotes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlgorithmNotes],
    }).compileComponents();

    fixture = TestBed.createComponent(AlgorithmNotes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
