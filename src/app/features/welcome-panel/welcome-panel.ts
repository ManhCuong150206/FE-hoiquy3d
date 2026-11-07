import { EntryForm } from './entry-form';
import { AuthSession } from '../../state/auth-session';
import { Component, inject, output, signal, viewChild } from '@angular/core';

@Component({
  selector: 'app-welcome-panel',
  imports: [EntryForm],
  templateUrl: './welcome-panel.html',
  styleUrl: './welcome-panel.css',
})
export class WelcomePanel {
  readonly auth=inject(AuthSession);
  readonly entering=signal(false);
  readonly explore = output<void>();
  readonly registering = signal(false);
  readonly message = signal('');

  private readonly entryForm = viewChild(EntryForm);
  resetEntry() { this.entryForm()?.reset(); this.registering.set(false); this.message.set(''); }
  async guest() {if(this.entering())return;this.entering.set(true);try{await this.auth.guest();this.resetEntry();this.explore.emit();}catch(error){this.message.set(error instanceof Error?error.message:'Không tạo được phiên Guest.');}finally{this.entering.set(false);}}

  toggleMode() { this.registering.update(value => !value); this.message.set(''); }

  registered() {
    this.registering.set(false);
    this.message.set('Đăng ký thành công. Hãy đăng nhập để lưu thí nghiệm.');
  }

  enteredDemo() {
    this.message.set('Đã xác thực với máy chủ.');
    this.explore.emit();
  }
}
