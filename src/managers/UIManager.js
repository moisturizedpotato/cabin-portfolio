import gsap from 'gsap';

export function createUIManager() {
  const elements = {
    loadingScreen: document.querySelector('#loading-screen'),
    loadingBar: document.querySelector('#loading-bar'),
    loadingText: document.querySelector('#loading-text'),
    blocksContainer: document.querySelector('#loading-blocks'),
    backButton: document.querySelector('#back-button'),
    whiteOverlay: document.querySelector('#white-fade-overlay'),
    githubBubble: document.querySelector('#github-bubble'),
    audioToggleBtn: document.querySelector('#audio-toggle'),
    blackOverlay: document.querySelector('#black-fade-overlay'),
    aeImageOverlay: document.querySelector('#ae-image-overlay'),
    blackBgLayer: document.querySelector('#black-bg-layer'),
    screenshotContainer: document.querySelector('#screenshot-container'),
    youtubePlayer: document.querySelector('#youtube-player'),
    playButton: document.querySelector('#play-button'),
    greyOverlay: document.querySelector('#grey-overlay'),
    aeAssetsScrollbox: document.querySelector('#ae-assets-scrollbox'),
    assetItems: document.querySelectorAll('.ae-asset-item'),
    mobileDropdown: document.querySelector('#ae-mobile-dropdown'),
    sceneScreenshot: document.querySelector('#scene-screenshot'),
    introText: document.querySelector('#intro-message-text'),
    introBox: document.querySelector('#intro-message-box')
  };


  const setupLoadingBlocks = (blockSize) => {
    const cols = Math.ceil(window.innerWidth / blockSize);
    const rows = Math.ceil(window.innerHeight / blockSize);
    const totalBlocks = cols * rows;

    if (elements.blocksContainer) {
      elements.blocksContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      elements.blocksContainer.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    }

    for (let i = 0; i < totalBlocks; i++) {
      const block = document.createElement('div');
      block.classList.add('loading-block');
      elements.blocksContainer?.appendChild(block);
    }

    return { cols, rows, totalBlocks };
  };

  const bindBasicUIEvents = () => {
    if (elements.backButton) {
      elements.backButton.addEventListener('mouseenter', () => {
        gsap.to(elements.backButton, { y: -8, duration: 0.4, ease: 'back.out(2)' });
      });

      elements.backButton.addEventListener('mouseleave', () => {
        gsap.to(elements.backButton, { y: 0, duration: 0.4, ease: 'power2.out' });
      });
    }
  };

  return {
    elements,
    setupLoadingBlocks,
    bindBasicUIEvents,
  };
}
