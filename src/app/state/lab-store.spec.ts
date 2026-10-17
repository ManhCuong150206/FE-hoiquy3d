import { TestBed } from '@angular/core/testing';
import { LabStore } from './lab-store';

describe('LabStore', () => {
  let service: LabStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LabStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
