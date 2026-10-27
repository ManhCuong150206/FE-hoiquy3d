import { Component, inject } from '@angular/core';
import { ExperimentsStore } from '../../state/experiments-store';
import { ThemeStore } from '../../state/theme-store';

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  exp = inject(ExperimentsStore);
  themeStore = inject(ThemeStore);
}
