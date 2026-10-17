import { Component } from '@angular/core';
import { Header } from './layout/header/header';
import { TrainingControls } from './features/training-controls/training-controls';
import { ExperimentsPanel } from './features/experiments-panel/experiments-panel';
import { DataPanel } from './features/data-panel/data-panel';
import { Viewport3d } from './features/viewport3d/viewport3d';
import { ResultsPanel } from './features/results-panel/results-panel';
import { AlgorithmNotes } from './features/algorithm-notes/algorithm-notes';

@Component({
  selector: 'app-root',
  imports: [Header, TrainingControls, ExperimentsPanel, DataPanel, Viewport3d, ResultsPanel, AlgorithmNotes],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App { }