import jsPDF from 'jspdf';
import { imageUrlToBase64, getLogoBase64 } from './imageToBase64';

interface PDFGeneratorOptions {
  analysisData: any;
  imageUrl?: string;
  userName?: string;
  epiItems?: string[];
}

export const generateAnalysisPDF = async (options: PDFGeneratorOptions) => {
  const { analysisData, imageUrl, userName = 'Usuario', epiItems = [] } = options;
  
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header con logo
  pdf.setFillColor(139, 154, 159);
  pdf.rect(0, 0, pageWidth, 45, 'F');
  
  // Intentar cargar logo
  try {
    const logoBase64 = await getLogoBase64();
    if (logoBase64) {
      pdf.addImage(logoBase64, 'JPEG', 15, 10, 25, 25);
    }
  } catch (error) {
    console.log('Logo no disponible en PDF');
  }
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CoironTech', 45, 22);
  
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Informe de Análisis de EPP', 45, 32);

  // Información
  yPosition = 55;
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(10);
  
  const date = new Date(analysisData.timestamp || Date.now());
  pdf.text(`Fecha: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`, 20, yPosition);
  yPosition += 6;
  pdf.text(`Inspector: ${userName}`, 20, yPosition);
  yPosition += 6;
  pdf.text(`Confianza Mínima: ${analysisData.MinConfidence}%`, 20, yPosition);
  yPosition += 10;

  // EPPs Evaluados
  if (epiItems && epiItems.length > 0) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(37, 99, 235);
    pdf.text('EPPs Evaluados:', 20, yPosition);
    yPosition += 6;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    
    const eppNames: any = {
      'HEAD_COVER': 'Casco',
      'EYE_COVER': 'Gafas de seguridad',
      'HAND_COVER': 'Guantes',
      'FOOT_COVER': 'Calzado de seguridad',
      'FACE_COVER': 'Mascarilla',
      'EAR_COVER': 'Protección auditiva'
    };
    
    const eppList = epiItems.map((item: string) => eppNames[item] || item).join(', ');
    const eppLines = pdf.splitTextToSize(eppList, pageWidth - 40);
    eppLines.forEach((line: string) => {
      pdf.text(line, 20, yPosition);
      yPosition += 5;
    });
    yPosition += 5;
  }

  // Resumen
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(37, 99, 235);
  pdf.text('Resumen del Análisis', 20, yPosition);
  yPosition += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  if (analysisData.Summary) {
    pdf.text(`Personas Detectadas: ${analysisData.Summary.totalPersons || 0}`, 20, yPosition);
    yPosition += 6;
    pdf.text(`Personas Cumplientes: ${analysisData.Summary.compliant || 0}`, 20, yPosition);
    yPosition += 6;
    
    const compliancePercent = analysisData.Summary.totalPersons > 0 
      ? Math.round((analysisData.Summary.compliant / analysisData.Summary.totalPersons) * 100)
      : 0;
    pdf.text(`Porcentaje de Cumplimiento: ${compliancePercent}%`, 20, yPosition);
    yPosition += 10;
  }

  // Resumen IA
  if (analysisData.aiSummary) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(147, 51, 234);
    pdf.text('Resumen Inteligente', 20, yPosition);
    yPosition += 8;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    
    const summaryText = analysisData.aiSummary.replace(/\*\*/g, '').replace(/•/g, '-');
    const lines = pdf.splitTextToSize(summaryText, pageWidth - 40);
    
    for (let i = 0; i < lines.length; i++) {
      if (yPosition > pageHeight - 30) {
        pdf.addPage();
        yPosition = 20;
      }
      pdf.text(lines[i], 20, yPosition);
      yPosition += 5;
    }
    yPosition += 5;
  }

  // Tabla EPP
  if (analysisData.ProtectiveEquipment && analysisData.ProtectiveEquipment.length > 0) {
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(34, 197, 94);
    pdf.text('Detalle de EPP Detectado', 20, yPosition);
    yPosition += 8;

    pdf.setFillColor(229, 231, 235);
    pdf.rect(20, yPosition - 5, pageWidth - 40, 8, 'F');
    
    pdf.setFontSize(9);
    pdf.text('Persona', 22, yPosition);
    pdf.text('Equipo', 70, yPosition);
    pdf.text('Confianza', 120, yPosition);
    pdf.text('Estado', 160, yPosition);
    yPosition += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);

    const epiNames: any = {
      'HEAD_COVER': 'Casco',
      'EYE_COVER': 'Gafas',
      'HAND_COVER': 'Guantes',
      'FOOT_COVER': 'Calzado',
      'FACE_COVER': 'Mascarilla',
      'EAR_COVER': 'Orejeras'
    };

    analysisData.ProtectiveEquipment.forEach((person: any, personIndex: number) => {
      person.BodyParts?.forEach((part: any) => {
        part.EquipmentDetections?.forEach((eq: any) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }

          const complies = eq.Confidence >= (analysisData.MinConfidence || 75);
          
          pdf.text(`Persona ${personIndex + 1}`, 22, yPosition);
          pdf.text(epiNames[eq.Type] || eq.Type, 70, yPosition);
          pdf.text(`${eq.Confidence.toFixed(1)}%`, 120, yPosition);
          
          pdf.setTextColor(complies ? 34 : 239, complies ? 197 : 68, complies ? 94 : 68);
          pdf.text(complies ? 'Cumple' : 'No Cumple', 160, yPosition);
          pdf.setTextColor(0, 0, 0);
          
          yPosition += 6;
        });
      });
    });
  }

  // Imagen original (solo una imagen hasta que se implemente generación de imagen anotada)
  if (imageUrl) {
    try {
      if (yPosition > pageHeight - 100) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(37, 99, 235);
      pdf.text('Imagen Analizada', 20, yPosition);
      yPosition += 10;
      
      // NOTA: La imagen anotada con boxes NO existe en S3 /output/
      // Lambda de análisis NO genera imágenes con anotaciones dibujadas
      // Por ahora solo mostramos la imagen original
      
      try {
        const originalBase64 = await imageUrlToBase64(imageUrl);
        
        // Crear imagen temporal para obtener dimensiones reales
        const img = new Image();
        img.src = originalBase64;
        
        await new Promise((resolve) => {
          img.onload = resolve;
        });
        
        // Calcular dimensiones manteniendo aspect ratio
        const maxWidth = pageWidth - 40;
        const maxHeight = 120;
        let imgWidth = img.width;
        let imgHeight = img.height;
        
        // Escalar proporcionalmente
        const widthRatio = maxWidth / imgWidth;
        const heightRatio = maxHeight / imgHeight;
        const ratio = Math.min(widthRatio, heightRatio);
        
        imgWidth = imgWidth * ratio;
        imgHeight = imgHeight * ratio;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 100, 100);
        pdf.text('Imagen Original del Análisis', 20, yPosition);
        yPosition += 5;
        
        pdf.addImage(originalBase64, 'JPEG', 20, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 10;
      } catch (imgError) {
        console.error('Error cargando imagen en PDF:', imgError);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(200, 0, 0);
        pdf.text('Error: No se pudo cargar la imagen. Verifique CORS en S3.', 20, yPosition);
        yPosition += 10;
      }
    } catch (error) {
      console.log('Error procesando imagen:', error);
    }
  }

  // Footer corporativo
  const footerY = pageHeight - 20;
  pdf.setFillColor(139, 154, 159);
  pdf.rect(0, footerY - 5, pageWidth, 25, 'F');
  
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CoironTech - Soluciones de IA para la Industria', pageWidth / 2, footerY + 2, { align: 'center' });
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text('www.coirontech.com | contacto@coirontech.com', pageWidth / 2, footerY + 7, { align: 'center' });
  
  pdf.setFontSize(6);
  pdf.setTextColor(200, 200, 200);
  pdf.text('Informe generado conforme a normas OSHA e ISO 45001', pageWidth / 2, footerY + 12, { align: 'center' });

  // Generar nombre único: Informe-EPP-{Inspector}-{YYYY-MM-DD-HHmm}.pdf
  const inspectorName = userName.replace(/\s+/g, '-');
  const dateStr = date.toISOString().slice(0, 16).replace('T', '-').replace(':', '');
  const fileName = `Informe-EPP-${inspectorName}-${dateStr}.pdf`;
  pdf.save(fileName);
};
