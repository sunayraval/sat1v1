/**
 * Utility to detect if an image is dark or light and apply appropriate styles
 */
export function setupImageThemeDetection() {
  const images = document.querySelectorAll('.question-content img');
  
  images.forEach(imgElement => {
    const img = imgElement as HTMLImageElement;
    // Create a canvas to analyze the image
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (context) {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image onto canvas
        context.drawImage(img, 0, 0);
        
        // Get image data
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let brightness = 0;
        
        // Calculate average brightness
        for (let i = 0; i < data.length; i += 4) {
          brightness += (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
        }
        
        brightness = brightness / (canvas.width * canvas.height);
        
        // If image is dark (brightness < 128), set theme attribute
        if (brightness < 128) {
          img.setAttribute('data-theme', 'dark');
        } else {
          img.setAttribute('data-theme', 'light');
        }
      };
    }
  });
}