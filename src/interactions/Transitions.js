import gsap from 'gsap';

export function fadeToYouTube({ whiteOverlay, backButton, onComplete }) {
  gsap.to(whiteOverlay, {
    opacity: 1,
    duration: 1.5,
    delay: 0.5,
    ease: 'power1.inOut',
    onStart: () => {
      gsap.to(backButton, { opacity: 0, duration: 0.2 });
    },
    onComplete,
  });
}

export function fadeToLinkedIn({ blackOverlay, backButton, audioToggleBtn, onComplete }) {
  gsap.to(blackOverlay, {
    opacity: 1,
    duration: 1.0,
    ease: 'power2.inOut',
    onStart: () => {
      gsap.to(backButton, { opacity: 0, duration: 0.2 });
      gsap.to(audioToggleBtn, { opacity: 0, duration: 0.2 });
    },
    onComplete,
  });
}

export function showAfterEffectsPreview({ aeImageOverlay, screenshotContainer, blackBgLayer, playButton, greyOverlay, backButton, audioToggleBtn, onComplete }) {
  gsap.to(aeImageOverlay, {
    yPercent: 0,
    y: 0,
    duration: 1.5,
    ease: 'power3.inOut',
    onStart: () => {
      gsap.to([backButton, audioToggleBtn], { opacity: 0, duration: 0.2 });
    },
  });

  gsap.to(screenshotContainer, {
    scale: window.innerWidth <= 768 ? 0.35 : 0.45,
    x: window.innerWidth <= 768 ? '0%' : '10%',
    y: window.innerWidth <= 768 ? '-25%' : '-13%',
    duration: 1.5,
    ease: 'power3.inOut',
    onComplete,
  });

  gsap.set([blackBgLayer, screenshotContainer], { opacity: 1 });
  gsap.set([playButton, greyOverlay], { opacity: 1 });
}

export function revertAfterEffectsPreview({ aeImageOverlay, screenshotContainer, blackBgLayer, playButton, greyOverlay, audioToggleBtn, onComplete }) {
  gsap.to([playButton, greyOverlay], { opacity: 0, duration: 0.2 });

  gsap.to(aeImageOverlay, {
    yPercent: 100,
    duration: 1.5,
    ease: 'power3.inOut',
  });

  gsap.to(screenshotContainer, {
    scale: 1,
    x: '0%',
    y: '0%',
    duration: 1.5,
    ease: 'power3.inOut',
    onComplete: () => {
      gsap.set([blackBgLayer, screenshotContainer], { opacity: 0 });
      gsap.set([playButton, greyOverlay], { opacity: 1 });
      gsap.to(audioToggleBtn, { opacity: 1, duration: 0.5 });
      onComplete?.();
    },
  });
}
