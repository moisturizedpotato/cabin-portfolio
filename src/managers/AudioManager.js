import { Howl, Howler } from 'howler';

export function createAudioManager() {
  let manual_toggles = true;
  const state = {
    isAudioMuted: true,
  };

  const soundDefinitions = {
    flower1: { src: ['/audio/flower_1_sfx.mp3'] },
    flower2: { src: ['/audio/flower_2_sfx.mp3'] },
    flower3: { src: ['/audio/flower_3_sfx.mp3'] },
    tyre: { src: ['/audio/tyre_hovered_sfx.mp3'], volume: 0.2 },
    whoosh: { src: ['/audio/camera_move_whoosh_sfx.mp3'] },
    flicker: { src: ['/audio/flickering_light_sfx.mp3'] },
    window: { src: ['/audio/window_inside_hover_sfx.mp3'], volume: 0.3 },
    sign: { src: ['/audio/sign_left_right_hover_sfx.mp3'], volume: 0.3 },
    door_opening: { src: ['/audio/door_opening_sfx.mp3'] },
    door_closing: { src: ['/audio/door_closing_sfx.mp3'] },
    bgm: { src: ['/audio/background_looping_sfx.mp3'], loop: true, volume: 0.2 },
  };

  const soundCache = {};

  const sfx = new Proxy({}, {
    get(_target, name) {
      if (!soundCache[name]) {
        const definition = soundDefinitions[name];
        if (!definition) return undefined;
        soundCache[name] = new Howl(definition);
      }

      return soundCache[name];
    },
  });

  const audioToggleBtn = document.querySelector('#audio-toggle');

  const applyMuteState = () => {
    Howler.mute(state.isAudioMuted);
    if (audioToggleBtn) {
      audioToggleBtn.innerText = state.isAudioMuted ? 'SOUND: OFF' : 'SOUND: ON';
    }
  };

  const toggleAudio = () => {
    state.isAudioMuted = !state.isAudioMuted;
    applyMuteState();

    if (!state.isAudioMuted) {
      const bgm = sfx.bgm;
      if (bgm && !bgm.playing()) {
        bgm.play();
      }
    }
  };

  const getManualToggle = () => {return manual_toggles;};

  const setMuted = (value) => {
    state.isAudioMuted = value;
    applyMuteState();
  };

  Howler.mute(true);
  if (audioToggleBtn) {
    audioToggleBtn.addEventListener('click', () => {
      manual_toggles = !manual_toggles;
      state.isAudioMuted = !state.isAudioMuted;
      applyMuteState();

      if (!state.isAudioMuted) {
        const bgm = sfx.bgm;
        if (bgm && !bgm.playing()) {
          bgm.play();
        }
      }
    });
  }

  return {
    sfx,
    state,
    toggleAudio,
    setMuted,
    isMuted: () => state.isAudioMuted,
    getManualToggle

  };
}
