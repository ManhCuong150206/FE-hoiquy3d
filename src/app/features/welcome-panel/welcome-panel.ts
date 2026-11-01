import { EntryForm } from './entry-form';
import { Component, output, signal, viewChild } from '@angular/core';

@Component({
  selector: 'app-welcome-panel',
  imports: [EntryForm],
  templateUrl: './welcome-panel.html',
  styleUrl: './welcome-panel.css',
})
export class WelcomePanel {
  readonly explore = output<void>();
  readonly registering = signal(false);
  readonly message = signal('');

  private readonly entryForm = viewChild(EntryForm);
  resetEntry() { this.entryForm()?.reset(); this.registering.set(false); this.message.set(''); }
  guest() { this.resetEntry(); this.explore.emit(); }

  toggleMode() { this.registering.update(value => !value); this.message.set(''); }

  enteredDemo() {
    this.message.set('Bạn đang trải nghiệm giao diện demo. Tài khoản chưa được xác thực.');
    this.explore.emit();
  }
}
