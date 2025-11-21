import html2canvas from 'html2canvas';

const DARK_BACKGROUND = '#020617';
const LIGHT_BACKGROUND = '#f9fafb';

function createDarkModeClone(element) {
  const clone = element.cloneNode(true);
  const wrapper = document.createElement('div');
  const width =
    element.offsetWidth || element.scrollWidth || element.clientWidth || 600;

  wrapper.className = 'scorecard-share-dark-wrapper dark';
  Object.assign(wrapper.style, {
    position: 'fixed',
    top: '-9999px',
    left: '-9999px',
    opacity: '0',
    pointerEvents: 'none',
    zIndex: '-1',
    background: DARK_BACKGROUND,
    padding: '24px',
    borderRadius: '24px',
    width: `${width}px`,
    boxSizing: 'border-box',
  });

  clone.style.width = '100%';
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  return {
    clone,
    cleanup: () => {
      if (wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
    },
  };
}

/**
 * Share scorecard as an image using Web Share API with fallback to download
 * @param {HTMLElement} element - The DOM element to capture (usually the scorecard table container)
 * @param {string} filename - The filename for the image (e.g., "Golf Scorecard")
 * @param {object} options - Additional capture options
 */
export async function shareScorecardAsImage(
  element,
  filename = 'Golf Scorecard',
  options = {}
) {
  if (!element) {
    console.error('No element provided for sharing');
    return { success: false, error: 'No element provided' };
  }

  const {
    forceDarkTheme = true,
    captureSelector = null,
    backgroundColor,
    scale = 2,
  } = options;

  let targetElement = element;
  let cleanupClone = () => {};

  if (forceDarkTheme) {
    const { clone, cleanup } = createDarkModeClone(element);
    targetElement = clone;
    cleanupClone = cleanup;
  }

  const captureElement =
    captureSelector && targetElement.querySelector(captureSelector)
      ? targetElement.querySelector(captureSelector)
      : targetElement.querySelector('table') || targetElement;

  if (!forceDarkTheme) {
    if (element.scrollTop !== undefined) {
      element.scrollTop = 0;
      element.scrollLeft = 0;
    }
    window.scrollTo(0, 0);
  }

  if (captureElement.scrollTop !== undefined) {
    captureElement.scrollTop = 0;
    captureElement.scrollLeft = 0;
  }

  await new Promise((resolve) => setTimeout(resolve, 150));

  const originalOverflow = captureElement.style.overflow;
  const originalMaxHeight = captureElement.style.maxHeight;
  const originalHeight = captureElement.style.height;

  captureElement.style.overflow = 'visible';
  captureElement.style.maxHeight = 'none';
  captureElement.style.height = 'auto';

  const restoreStyles = () => {
    captureElement.style.overflow = originalOverflow;
    captureElement.style.maxHeight = originalMaxHeight;
    captureElement.style.height = originalHeight;
  };

  try {
    const canvas = await html2canvas(captureElement, {
      backgroundColor:
        backgroundColor ?? (forceDarkTheme ? DARK_BACKGROUND : LIGHT_BACKGROUND),
      scale,
      logging: false,
      useCORS: true,
      allowTaint: false,
      scrollX: 0,
      scrollY: 0,
    });

    restoreStyles();
    cleanupClone();

    return new Promise((resolve) => {
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            console.error('Failed to create blob from canvas');
            resolve({ success: false, error: 'Failed to create image' });
            return;
          }

          const file = new File([blob], `${filename}.png`, {
            type: 'image/png',
          });

          if (navigator.share && navigator.canShare) {
            try {
              const shareData = {
                title: filename,
                files: [file],
              };

              if (navigator.canShare(shareData)) {
                await navigator.share(shareData);
                resolve({ success: true, method: 'native' });
                return;
              }
            } catch (error) {
              if (error.name !== 'AbortError') {
                console.error('Error sharing file:', error);
              }
            }
          }

          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${filename}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          resolve({ success: true, method: 'download' });
        },
        'image/png'
      );
    });
  } catch (error) {
    restoreStyles();
    cleanupClone();
    console.error('Error capturing scorecard:', error);
    return { success: false, error: error.message };
  }
}

