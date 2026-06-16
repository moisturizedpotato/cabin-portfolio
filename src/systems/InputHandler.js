export function createInputHandler({
  cursorParticles,
  elements,
  onInteraction,
  onResize,
  onPlayButtonClick,
  onBackButtonClick,
  onAssetItemClick,
  onMobileDropdown,
  onEnterButton,
  onExitProspectWindow
}) {
  const updatePointerFromEvent = (event) => {
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    const pointer = { x: (clientX / window.innerWidth) * 2 - 1, y: -(clientY / window.innerHeight) * 2 + 1 };

    return pointer;
  };

  const spawnCursorParticles = (x, y, amount, spreadX = 2, spreadY = 2) => {
    for (let i = 0; i < amount; i++) {
      cursorParticles.push({
        x,
        y,
        size: Math.random() * 8 + 4,
        life: 1.0,
        velocityX: (Math.random() - 0.5) * spreadX,
        velocityY: (Math.random() - 0.5) * spreadY - 1,
      });
    }
  };

  const handleMouseMove = (event) => {
    const pointer = updatePointerFromEvent(event);
    if (typeof onInteraction?.updatePointer === 'function') {
      onInteraction.updatePointer(pointer);
    }
    spawnCursorParticles(event.clientX, event.clientY, 2, 2, 2);
  };

  const handleTouchStart = (event) => {
    const pointer = updatePointerFromEvent(event);
    if (typeof onInteraction?.updatePointer === 'function') {
      onInteraction.updatePointer(pointer);
    }
    spawnCursorParticles(event.touches[0].clientX, event.touches[0].clientY, 5, 4, 4);
  };

  const handleTouchEnd = (event) => {
    if (event.target === elements.enterButton || event.target === elements.closeProspectWindowButton || event.target === elements.mobileDropdown || event.target === elements.backButton || event.target === elements.audioToggleBtn || event.target === elements.playButton) {
      return;
    }

    event.preventDefault();
    onInteraction?.handle();
  };

  const handleClick = () => {
    onInteraction?.handle();
  };

  const bind = () => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    window.addEventListener('click', handleClick);
    window.addEventListener('resize', onResize);

    if (elements.playButton && typeof onPlayButtonClick === 'function') {
      elements.playButton.addEventListener('click', onPlayButtonClick);
    }

    if (elements.backButton && typeof onBackButtonClick === 'function') {
      elements.backButton.addEventListener('click', onBackButtonClick);
    }
    if (elements.enterButton && typeof onEnterButton === 'function'){
      elements.enterButton.addEventListener('click', onEnterButton);
    }
    if (elements.closeProspectWindowButton && typeof onExitProspectWindow === 'function'){
     elements.closeProspectWindowButton.addEventListener('click', onExitProspectWindow);
    }
    if (elements.assetItems && typeof onAssetItemClick === 'function')
    {
        elements.assetItems.forEach((item) => {
            item.addEventListener('click', (event)=>{
                onAssetItemClick(event);
            });
        });
    }
    if (elements.mobileDropdown && typeof onMobileDropdown === 'function')
    {
        elements.mobileDropdown.addEventListener("change", (event)=>{
            onMobileDropdown(event);
        });
    }
  };

  return {
    bind,
    updatePointerFromEvent,
    spawnCursorParticles,
    handleMouseMove,
    handleTouchStart,
    handleTouchEnd,
  };
}
