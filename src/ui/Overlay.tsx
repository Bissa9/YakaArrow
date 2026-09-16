import type { LiveWhistle, MicState } from '../audio/useWhistle'

type StartProps = {
  pending: boolean
  onWhistle: () => void
  onKeyboard: () => void
}

export function StartScreen({ pending, onWhistle, onKeyboard }: StartProps) {
  return (
    <div className="overlay">
      <div className="panel">
        <p className="kicker">Guardians tribute</p>
        <h1>Yaka Arrow</h1>
        <p className="lede">
          A red-lit hall of yellow stone. Whistle, and the arrow answers. A high note sends it
          cutting fast. Let the note fall, and it slows. Go silent, and it hangs in the dark —
          turning, drifting, waiting for you.
        </p>
        <div className="actions">
          <button type="button" onClick={onWhistle} disabled={pending}>
            {pending ? 'Listening for mic…' : 'Enable whistle'}
          </button>
          <button type="button" className="ghost" onClick={onKeyboard}>
            Use keyboard
          </button>
        </div>
        <p className="hint">
          After you enter, drag or click to steer. Hold Space if you cannot whistle. Shift + Space
          is a high note.
        </p>
      </div>
    </div>
  )
}

type HudProps = {
  ui: LiveWhistle
  mic: MicState
  message: string
}

export function Hud({ ui, mic, message }: HudProps) {
  const width = `${Math.round(ui.speed * 100)}%`
  const pitch = ui.active ? `${Math.round(ui.hz)} Hz` : 'silent'
  const micLabel =
    mic === 'on' ? 'Whistle live' : mic === 'denied' ? 'Mic blocked' : mic === 'error' ? 'Mic unavailable' : 'Keyboard'

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="chip">
          <p>Control</p>
          <strong>{micLabel}</strong>
        </div>
        <div className="meter-wrap">
          <p>Pitch → speed</p>
          <strong>{pitch}</strong>
          <div className="meter" aria-hidden>
            <span style={{ width }} />
          </div>
        </div>
      </div>
      <div className="hud-bottom">
        <p className="help">
          High whistle: fast. Low whistle: slow. No sound: it floats and turns. Drag or WASD to
          aim. Hold Space to fly without a mic.
          {message ? (
            <>
              {' '}
              <span className="mic-error">{message}</span>
            </>
          ) : null}
        </p>
      </div>
    </div>
  )
}
