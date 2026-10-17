import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataPanel } from './data-panel';

describe('DataPanel', () => {
  let component: DataPanel;
  let fixture: ComponentFixture<DataPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(DataPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
