import { Component, ElementRef, output, signal, viewChild } from '@angular/core';

@Component({
  selector: 'app-welcome-panel',
  templateUrl: './welcome-panel.html',
  styleUrl: './welcome-panel.css',
})
export class WelcomePanel {
  readonly explore = output<void>();
  readonly registering = signal(false);
  readonly message = signal('');

  private readonly entryForm = viewChild<ElementRef<HTMLFormElement>>('entryForm');
  resetEntry() { this.entryForm()?.nativeElement.reset(); this.registering.set(false); this.message.set(''); }
  guest() { this.resetEntry(); this.explore.emit(); }

  toggleMode() { this.registering.update(value => !value); this.message.set(''); }

  submit(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    if (!form.reportValidity()) return;
    form.reset();
    this.message.set('Bạn đang trải nghiệm giao diện demo. Tài khoản chưa được xác thực.');
    this.explore.emit();
  }
}
