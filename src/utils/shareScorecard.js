import html2canvas from 'html2canvas';

/**
 * Share scorecard as an image using Web Share API with fallback to download
 * @param {HTMLElement} element - The DOM element to capture (usually the scorecard table container)
 * @param {string} filename - The filename for the image (e.g., "Golf Scorecard")
 */
export async function shareScorecardAsImage(element, filename = 'Golf Scorecard') {
  if (!element) {
    console.error('No element provided for sharing');
    return { success: false, error: 'No element provided' };
  }

  try {
    // Find the table element inside the container
    const tableElement = element.querySelector('table') || element;
    
    // Scroll to top to ensure we start from the beginning
    if (element.scrollTop !== undefined) {
      element.scrollTop = 0;
      element.scrollLeft = 0;
    }
    
    // Also scroll window if needed
    window.scrollTo(0, 0);
    
    // Wait for scroll to complete
    await new Promise(resolve => setTimeout(resolve, 150));

    // Temporarily remove overflow constraints to capture full content
    const originalOverflow = element.style.overflow;
    const originalMaxHeight = element.style.maxHeight;
    const originalHeight = element.style.height;
    
    // Remove overflow constraints
    element.style.overflow = 'visible';
    element.style.maxHeight = 'none';
    element.style.height = 'auto';
    
    try {
      // Capture the element (which now shows full content)
      const canvas = await html2canvas(element, {
        backgroundColor: '#f9fafb',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: false,
        scrollX: 0,
        scrollY: 0,
      });
      
      // Restore original styles
      element.style.overflow = originalOverflow;
      element.style.maxHeight = originalMaxHeight;
      element.style.height = originalHeight;

      // Convert canvas to blob and share
      return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          console.error('Failed to create blob from canvas');
          resolve({ success: false, error: 'Failed to create image' });
          return;
        }

        const file = new File([blob], `${filename}.png`, { type: 'image/png' });

        // Try Web Share API with file
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
            // If sharing fails, fall through to download
            if (error.name !== 'AbortError') {
              console.error('Error sharing file:', error);
            }
          }
        }

        // Fallback: Download the image
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        resolve({ success: true, method: 'download' });
      }, 'image/png');
    });
    } catch (error) {
      // Restore original styles on error
      element.style.overflow = originalOverflow;
      element.style.maxHeight = originalMaxHeight;
      element.style.height = originalHeight;
      throw error;
    }
  } catch (error) {
    console.error('Error capturing scorecard:', error);
    return { success: false, error: error.message };
  }
}

