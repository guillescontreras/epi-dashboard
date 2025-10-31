export const imageUrlToBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Limpiar URL: remover parámetros de firma si existen
    const cleanUrl = url.split('?')[0];
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('No se pudo obtener contexto del canvas'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataURL);
      } catch (error) {
        reject(new Error(`Error convirtiendo imagen: ${error}`));
      }
    };
    
    img.onerror = (error) => {
      reject(new Error(`Error cargando imagen desde ${cleanUrl}: ${error}`));
    };
    
    // Usar URL limpia sin parámetros de firma
    img.src = cleanUrl;
  });
};

export const getLogoBase64 = async (): Promise<string> => {
  try {
    return await imageUrlToBase64('/CoironTech-logo1.jpeg');
  } catch (error) {
    console.error('Error cargando logo:', error);
    return '';
  }
};
