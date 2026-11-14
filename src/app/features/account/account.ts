import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Header } from '../../layout/header/header';
import { AccountApi, AccountUser } from './account-api';

type Card = 'profile' | 'password' | 'delete';
@Component({
  selector: 'app-account',
  imports: [DatePipe, FormsModule, RouterLink, Header],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class Account {
  readonly api = inject(AccountApi);
  private readonly router = inject(Router);
  readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('confirmation');
  readonly pending = signal<Card | null>(null);
  readonly errors = signal<Record<Card, string>>({ profile: '', password: '', delete: '' });
  readonly success = signal<Record<Card, string>>({ profile: '', password: '', delete: '' });
  displayName = this.api.user()?.displayName ?? '';
  currentPassword = '';
  newPassword = '';
  repeatedPassword = '';
  deletePassword = '';
  validPassword(value: string) { return value.length >= 8 && new TextEncoder().encode(value).byteLength <= 72; }
  private error(card: Card, message: string) { this.errors.update(v => ({ ...v, [card]: message })); }
  private async submit(card: Card, operation: () => Promise<void>, message: string) {
    if (this.pending()) return;
    this.pending.set(card);
    this.error(card, '');
    this.success.update(v => ({ ...v, [card]: '' }));
    try { await operation(); this.success.update(v => ({ ...v, [card]: message })); }
    catch (error) { this.error(card, error instanceof Error ? error.message : 'Không thể gửi yêu cầu. Vui lòng thử lại.'); }
    finally { this.pending.set(null); }
  }
  saveName() {
    const displayName = this.displayName.trim();
    if (!displayName || displayName.length > 120) { this.error('profile', 'Tên hiển thị phải có từ 1 đến 120 ký tự.'); return; }
    return this.submit('profile', async () => {
      this.api.accept(await this.api.request<AccountUser>('', 'POST', { displayName }));
      this.displayName = this.api.user()!.displayName;
    }, 'Đã lưu tên hiển thị.');
  }
  changePassword() {
    if (![this.currentPassword, this.newPassword, this.repeatedPassword].every(v => this.validPassword(v))) {
      this.error('password', 'Mỗi mật khẩu cần ít nhất 8 ký tự, tối đa 72 byte UTF-8. Chữ có dấu hoặc emoji có thể chiếm nhiều byte.'); return;
    }
    if (this.newPassword !== this.repeatedPassword) { this.error('password', 'Mật khẩu nhập lại chưa khớp.'); return; }
    return this.submit('password', async () => {
      this.api.accept(await this.api.request<AccountUser>('/password', 'POST', { currentPassword: this.currentPassword, newPassword: this.newPassword }));
      this.currentPassword = this.newPassword = this.repeatedPassword = '';
    }, 'Đã đổi mật khẩu. Bạn vẫn đang đăng nhập.');
  }
  openDelete() {
    this.deletePassword = ''; this.error('delete', '');
    this.dialog()?.nativeElement.showModal();
  }
  closeDelete(event?: Event) {
    if (this.pending()) { event?.preventDefault(); return; }
    this.deletePassword = ''; this.dialog()?.nativeElement.close();
  }
  deleteAccount() {
    if (!this.validPassword(this.deletePassword)) { this.error('delete', 'Mật khẩu cần ít nhất 8 ký tự, tối đa 72 byte UTF-8.'); return; }
    return this.submit('delete', async () => {
      const result = await this.api.request<{ success: boolean }>('', 'DELETE', { password: this.deletePassword });
      if (!result?.success) throw new Error('Chưa xóa được tài khoản. Vui lòng thử lại.');
      this.deletePassword = '';
      this.dialog()?.nativeElement.close();
      this.api.clear();
      await this.router.navigateByUrl('/');
    }, 'Đã xóa tài khoản.');
  }
}
