/// <reference lib="webworker" />
import { TrainingSession } from './training-session';
let session: TrainingSession | null = null;
let runId = 0;
let speed = 1;
let timer: ReturnType<typeof setTimeout> | undefined;
const send = (data: object) => postMessage({ ...data, runId });
const telemetry = () => ({ computeMs: session?.computeMs ?? 0, setupMs: session?.setupMs ?? 0, stopReason: session?.done ? session.stopReason : null });
const report = () => { if (session) send({ type: 'step', ...session.current, done: session.done, ...telemetry() }); };
function fail(error: unknown) {
  clearTimeout(timer);
  send({ type: 'error', message: error instanceof Error ? error.message : 'Không tính được bước học.', ...telemetry() });
}
function loop() {
  try {
    if (!session?.step()) return;
    report();
    if (!session.done) timer = setTimeout(loop, 16 / speed);
  } catch (error) { fail(error); }
}
addEventListener('message', ({ data }) => {
  if (data.type !== 'init' && data.runId !== runId) return;
  try {
    switch (data.type) {
      case 'init':
        clearTimeout(timer); runId = data.runId; session = null; speed = data.speed;
        session = new TrainingSession({ ...data, degree: Math.max(1, Math.floor(Number(data.degree) || 2)) });
        report(); break;
      case 'play':
        clearTimeout(timer);
        if (data.previewMs > 0) timer = setTimeout(loop, data.previewMs);
        else loop();
        break;
      case 'pause': clearTimeout(timer); send({ type: 'paused', requestId: data.requestId }); break;
      case 'step': clearTimeout(timer); if (session?.step()) report(); break;
      case 'prepare': {
        clearTimeout(timer);
        const snapshot = session?.prepare() ?? null;
        send({ type: 'prepared', snapshot, ...telemetry() });
        if (session && snapshot) {
          send({ type: 'lesson-preview', iteration: snapshot.before.iteration, preview: session.preview(snapshot) });
        }
        break;
      }
      case 'commit': if (session?.commit(data.iteration)) report(); break;
      case 'discard': session?.discard(); break;
      case 'speed': speed = data.speed; break;
    }
  } catch (error) { fail(error); }
});
