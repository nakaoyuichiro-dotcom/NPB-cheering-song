import { assetUrl } from './dataLoader.js';
import { isSoundEnabled } from './soundSettings.js';

const paths = {
  correct: '/audio/se/correct.mp3',
  incorrect: '/audio/se/incorrect.mp3',
};

export function createQuizSounds() {
  const sounds = Object.fromEntries(Object.entries(paths).map(([name, path]) => {
    const audio = new Audio(assetUrl(path));
    audio.preload = 'none';
    return [name, audio];
  }));

  return {
    play(result) {
      if (!isSoundEnabled()) return;
      const audio = sounds[result];
      if (!audio) return;
      audio.currentTime = 0;
      audio.play().catch(error => {
        if (error.name !== 'AbortError') console.warn('[quizSound] 効果音を再生できません', error);
      });
    },
    destroy() {
      Object.values(sounds).forEach(audio => {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      });
    },
  };
}
