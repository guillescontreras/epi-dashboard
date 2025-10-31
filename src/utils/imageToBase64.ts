export const imageUrlToBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo obtener contexto del canvas'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      try {
        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataURL);
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error('Error cargando imagen'));
    img.src = url;
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
