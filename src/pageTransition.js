let latestTransition = 0;

export async function transitionPage(container, render) {
  const transition = ++latestTransition;
  container.getAnimations().forEach(animation => animation.cancel());
  container.classList.remove('page-fade-out', 'page-fade-in');

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    container.inert = false;
    render();
    return;
  }

  async function fade(className) {
    container.classList.add(className);
    await Promise.allSettled(container.getAnimations().map(animation => animation.finished));
  }

  // Ignore obsolete transitions when browser history changes in quick succession.
  container.inert = true;
  try {
    await fade('page-fade-out');
    if (transition !== latestTransition) return;
    container.classList.remove('page-fade-out');
    container.inert = false;
    render();
    await fade('page-fade-in');
  } finally {
    if (transition === latestTransition) {
      container.classList.remove('page-fade-out', 'page-fade-in');
      container.inert = false;
    }
  }
}
