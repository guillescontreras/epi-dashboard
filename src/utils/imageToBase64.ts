export const imageUrlToBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Timeout de 10 segundos
    const timeout = setTimeout(() => {
      reject(new Error('Timeout cargando imagen'));
    }, 10000);
    
    // Limpiar URL: remover parámetros de firma si existen
    let cleanUrl = url.split('?')[0];
    
    // Si la URL no tiene protocolo, agregar https://
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = 'https://' + cleanUrl.replace(/^\/+/, '');
    }
    
    console.log('Cargando imagen para PDF:', cleanUrl);
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      clearTimeout(timeout);
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
        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        console.log('Imagen convertida exitosamente a base64');
        resolve(dataURL);
      } catch (error) {
        reject(new Error(`Error convirtiendo imagen: ${error}`));
      }
    };
    
    img.onerror = (error) => {
      clearTimeout(timeout);
      console.error('Error cargando imagen:', error);
      reject(new Error(`Error cargando imagen desde ${cleanUrl}. Verifique que la URL sea accesible y CORS esté configurado.`));
    };
    
    // Usar URL limpia sin parámetros de firma
    img.src = cleanUrl;
  });
};

export const getLogoBase64 = async (): Promise<string> => {
  try {
    const logoPath = '/coirontech-logo.jpeg';
    const response = await fetch(logoPath);
    if (!response.ok) throw new Error('Logo no encontrado');
    
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.log('Logo no disponible:', error);
    return '';
  }
};
