import { Component, inject } from '@angular/core';
import { ExperimentsStore } from '@app/core';
import { ThemeStore } from '@app/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  exp = inject(ExperimentsStore);
  themeStore = inject(ThemeStore);
}
