import { AuthSession } from './state/auth-session';
import { closePlanetCinema } from './presentation/algorithm-flight';
import { CardGlow } from './presentation/card-glow';
import { Component, effect, untracked, DestroyRef, ElementRef, Injector, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { Header } from './layout/header/header';
import { TrainingControls } from './features/training-controls/training-controls';
import { ExperimentsPanel } from './features/experiments-panel/experiments-panel';
import { DataPanel } from './features/data-panel/data-panel';
import { Viewport3d } from './features/viewport3d/viewport3d';
import { ResultsPanel } from './features/results-panel/results-panel';
import { AlgorithmNotes } from './features/algorithm-notes/algorithm-notes';
import { LearningWalkthrough } from './features/learning-walkthrough/learning-walkthrough';
import { WelcomePanel } from './features/welcome-panel/welcome-panel';
import { AlgorithmPicker } from './features/algorithm-picker/algorithm-picker';
import { Algorithm, ALGORITHM_LABELS } from './core/models/experiment';
import { JourneyMotion } from './presentation/journey-motion';
import { SpatialBackdrop } from './presentation/spatial-backdrop';
import { LabStore } from './state/lab-store';

@Component({
  selector: 'app-root',
  host: { '[class.low-effects]': 'lowEffects()' },
  imports: [CardGlow, Header, TrainingControls, ExperimentsPanel, DataPanel, Viewport3d, ResultsPanel, AlgorithmNotes, LearningWalkthrough, WelcomePanel, AlgorithmPicker, JourneyMotion, SpatialBackdrop],
  templateUrl: './app.html', styleUrl: './app.css',
})
export class App {
  readonly lab = inject(LabStore);
  private readonly auth=inject(AuthSession);
  readonly authError=this.auth.error;
  private sessionScope=this.auth.scope();
  private loggingOut=false;
  private readonly injector = inject(Injector);
  readonly lessonPhase = signal<number | null>(null);
  readonly opened = signal(false);
  readonly activeScreen = signal('welcome');
  readonly preview = signal<Algorithm>('linear');
  readonly pending = signal<Algorithm | null>(null);
  readonly labels = ALGORITHM_LABELS;
  readonly transitioning = signal(false);
  readonly lowEffects = signal(false);
  private readonly motion = viewChild(JourneyMotion);
  private readonly picker = viewChild(AlgorithmPicker);
  private destroyed=false;
  private readonly welcome = viewChild(WelcomePanel);
  private readonly confirmDialog = viewChild<ElementRef<HTMLDialogElement>>('confirmDialog');
  readonly pageBusy = signal(false);

  constructor(){
    effect(()=>{const scope=this.auth.scope();if(scope===this.sessionScope)return;this.sessionScope=scope;
      if(!this.loggingOut&&!this.auth.migration()&&(this.opened()||this.activeScreen()!=='welcome'))untracked(()=>this.clearSessionView());});
    inject(DestroyRef).onDestroy(()=>{this.destroyed=true;this.picker()?.restoreFlight();});}
  enterGuest(){void this.welcome()?.guest();}
  navigate(screen: string, _cinematic = false, handoff=false) {
    if(this.pageBusy())return;
    if (!['welcome', 'algorithms', 'lab', 'learning'].includes(screen) || ((screen === 'lab' || screen === 'learning') && !this.opened())) return;
    this.motion()?.settle();
    const target = document.getElementById(screen); if (!target) { this.activeScreen.set(screen); return; }
    const previous=this.activeScreen();
    const reverse=screen==='algorithms' && (previous==='lab'||previous==='learning') && !!this.picker();
    if(reverse){this.lab.pause();this.transitioning.set(true);this.picker()?.prepareReturn(this.preview());}
    const from = document.getElementById(previous);
    if (screen === this.activeScreen() && !this.pageBusy()) { this.transitioning.set(false); return; }
    this.pageBusy.set(true);
    const swap = () => this.activeScreen.set(screen);
    const release=()=>{closePlanetCinema();this.pageBusy.set(false);this.transitioning.set(false);};
    const done=()=>{
      if(reverse){void this.picker()!.animate(this.preview(),true).catch(()=>this.picker()?.restoreFlight()).finally(release);}
      else release();
    };
    const motion = this.motion();
    if (motion) motion.switchPage(from, target, this.preview(), swap, done, handoff||reverse);
    else { swap(); done(); }
  }

  async logout() {
    if(this.loggingOut)return;this.loggingOut=true;
    this.lab.pause(); this.cancelChange(); this.welcome()?.resetEntry();
    try { await this.auth.logout(); this.sessionScope=this.auth.scope();this.clearSessionView(false);this.navigate('welcome', true); }
    catch(error){this.auth.error.set(error instanceof Error?error.message:'Không đăng xuất được.');}
    finally{this.loggingOut=false;}
  }

  private clearSessionView(returnWelcome=true){
    this.motion()?.settle();this.picker()?.restoreFlight();this.lab.resetSession();this.opened.set(false);
    this.lessonPhase.set(null);if(returnWelcome)this.activeScreen.set('welcome');this.preview.set('linear');this.pageBusy.set(false);
  }

  chooseAlgorithm(algorithm: Algorithm) {
    if(this.pageBusy()||this.transitioning())return;
    if (algorithm !== this.lab.algorithm() && this.lab.iteration() > 0) {
      this.pending.set(algorithm);
      this.confirmDialog()?.nativeElement.showModal();
      return;
    }
    this.openAlgorithm(algorithm);
  }

  confirmChange() {
    const algorithm = this.pending();
    this.cancelChange();
    if (algorithm) this.openAlgorithm(algorithm);
  }

  cancelChange() { this.pending.set(null); this.confirmDialog()?.nativeElement.close(); }

  private openAlgorithm(algorithm: Algorithm) {
    const picker=this.picker();
    if(!picker){this.completeAlgorithm(algorithm,false);return;}
    this.pageBusy.set(true);this.transitioning.set(true);
    this.opened.set(true); // Warm the hidden lab while the star travels; do not train or show it yet.
    void picker.animate(algorithm).then(played=>this.completeAlgorithm(algorithm,played)).catch(()=>{picker.restoreFlight();this.completeAlgorithm(algorithm,false);});
  }
  private completeAlgorithm(algorithm:Algorithm,handoff:boolean){
    if(this.destroyed)return;
    if (this.lab.algorithm() !== algorithm) this.lab.setAlgorithm(algorithm);
    this.preview.set(algorithm);
    this.opened.set(true);
    this.transitioning.set(true);
    afterNextRender(() => {
      this.pageBusy.set(false);if(handoff)this.navigate('lab',true,true);else this.navigate('lab',true);
      document.getElementById('lab-title')?.focus({ preventScroll: true });
    }, { injector: this.injector });
  }
}
