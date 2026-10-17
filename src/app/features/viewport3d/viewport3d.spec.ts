import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Viewport3d } from './viewport3d';

describe('Viewport3d', () => {
  let component: Viewport3d;
  let fixture: ComponentFixture<Viewport3d>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Viewport3d],
    }).compileComponents();

    fixture = TestBed.createComponent(Viewport3d);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
