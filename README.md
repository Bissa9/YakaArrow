# Yaka Arrow

A small 3D tribute to Yondu’s Yaka Arrow. You stand in a mid-dark hall of yellow rock, lit red. The arrow floats and turns on its own. Whistle, and it flies the way it is facing. A higher note sends it faster. A lower note slows it. Silence puts it back into a slow wave.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default `http://localhost:45321`). The microphone only works in a **secure context**: `localhost` or HTTPS, in a real browser tab. The cloud computer cannot hear you. Cursor’s preview frame often blocks the mic — click Enable whistle and Allow, or open the preview in its own tab. Hold Space if the mic never starts.

## Controls

- **Whistle** into the mic: fly. Pitch maps to speed.
- **Silence**: hover, bob, and slowly turn.
- **Mouse drag** or **pointer lock** (click the hall): steer.
- **WASD / arrows**: steer.
- **Space**: fly without a whistle. **Shift + Space**: high-note speed.

## Notes

The scene is built to stay light: one instanced rock mesh, no shadows, capped pixel ratio, and a short flight trail. If the browser blocks the mic, use the keyboard.
