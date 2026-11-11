import { TestBed } from '@angular/core/testing';
import { CsvImport } from './csv-import';

describe('CsvImport rejected replacement', () => {
  it('retains the previous preview and explicitly identifies it after an invalid file', async () => {
    const fixture = TestBed.createComponent(CsvImport);
    const component = fixture.componentInstance;
    const upload = async (name: string, content: string) => {
      const input = document.createElement('input');
      input.type = 'file';
      Object.defineProperty(input, 'files', { value: [{ name, size: content.length, text: async () => content }] });
      const event = new Event('change');
      Object.defineProperty(event, 'target', { value: input });
      await component.onFile(event);
    };
    await upload('valid.csv', 'x,y\n1,2\n2,3');
    const previous = component.table();
    await upload('invalid.csv', 'not-a-dataset');
    expect(component.table()).toBe(previous);
    expect(component.fileName()).toBe('valid.csv');
    expect(component.message()?.kind).toBe('error');
    expect(component.message()?.text).toContain('Vẫn giữ tệp trước: “valid.csv”');
  });
});
