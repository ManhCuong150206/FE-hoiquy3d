/// <reference lib="webworker" />
import { TrainingSession } from './training-session';
let session: TrainingSession | null = null;
let runId = 0;
let speed = 1;
let timer: ReturnType<typeof setTimeout> | undefined;
const send = (data: object) => postMessage({ ...data, runId });
const report = () => { if (session) send({ type: 'step', ...session.current, done: session.done }); };
function fail(error: unknown) {
  clearTimeout(timer);
  send({ type: 'error', message: error instanceof Error ? error.message : 'Không tính được bước học.' });
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
      case 'play': clearTimeout(timer); loop(); break;
      case 'pause': clearTimeout(timer); send({ type: 'paused', requestId: data.requestId }); break;
      case 'step': clearTimeout(timer); if (session?.step()) report(); break;
      case 'prepare':
        clearTimeout(timer); send({ type: 'prepared', snapshot: session?.prepare() ?? null }); break;
      case 'commit': if (session?.commit(data.iteration)) report(); break;
      case 'discard': session?.discard(); break;
      case 'speed': speed = data.speed; break;
    }
  } catch (error) { fail(error); }
});
