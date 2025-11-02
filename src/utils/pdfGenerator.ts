import jsPDF from 'jspdf';
import { getLogoBase64 } from './imageToBase64';

interface PDFGeneratorOptions {
  analysisData: any;
  imageUrl?: string;
  userName?: string;
  epiItems?: string[];
  compliantCount?: number;
}

export const generateAnalysisPDF = async (options: PDFGeneratorOptions) => {
  const { analysisData, imageUrl, userName = 'Usuario', epiItems = [], compliantCount } = options;
  
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header con logo - Gradiente simulado con dos rectángulos
  pdf.setFillColor(102, 126, 234);
  pdf.rect(0, 0, pageWidth, 45, 'F');
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, 0, pageWidth / 2, 45, 'F');
  
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
  if (analysisData.analysisId) {
    pdf.text(`ID de Análisis: ${analysisData.analysisId}`, 20, yPosition);
    yPosition += 6;
  }
  pdf.text(`Confianza Mínima: ${analysisData.MinConfidence || analysisData.Summary?.minConfidence || 75}%`, 20, yPosition);
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

  // Resumen con tarjetas modernas
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(37, 99, 235);
  pdf.text('Resumen del Análisis', 20, yPosition);
  yPosition += 10;
  
  if (analysisData.Summary) {
    const actualCompliant = compliantCount !== undefined ? compliantCount : analysisData.Summary.compliant;
    const compliancePercent = analysisData.Summary.totalPersons > 0 
      ? Math.round((actualCompliant / analysisData.Summary.totalPersons) * 100)
      : 0;

    // Tarjeta 1: Personas Detectadas
    pdf.setFillColor(59, 130, 246);
    pdf.roundedRect(20, yPosition, 50, 20, 3, 3, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${analysisData.Summary.totalPersons || 0}`, 45, yPosition + 10, { align: 'center' });
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Personas', 45, yPosition + 16, { align: 'center' });

    // Tarjeta 2: Cumplientes
    pdf.setFillColor(34, 197, 94);
    pdf.roundedRect(75, yPosition, 50, 20, 3, 3, 'F');
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${actualCompliant || 0}`, 100, yPosition + 10, { align: 'center' });
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Cumplientes', 100, yPosition + 16, { align: 'center' });

    // Tarjeta 3: Porcentaje
    pdf.setFillColor(compliancePercent >= 80 ? 34 : compliancePercent >= 50 ? 251 : 239, 
                     compliancePercent >= 80 ? 197 : compliancePercent >= 50 ? 146 : 68, 
                     compliancePercent >= 80 ? 94 : compliancePercent >= 50 ? 60 : 68);
    pdf.roundedRect(130, yPosition, 50, 20, 3, 3, 'F');
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${compliancePercent}%`, 155, yPosition + 10, { align: 'center' });
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Cumplimiento', 155, yPosition + 16, { align: 'center' });

    yPosition += 26;
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
      pdf.text(lines[i], 20, yPosition, { maxWidth: pageWidth - 40, align: 'justify' });
      yPosition += 5;
    }
    yPosition += 5;
  }

  // Tabla Mejorada de Análisis por Persona
  if (analysisData.ProtectiveEquipment && analysisData.ProtectiveEquipment.length > 0 && epiItems && epiItems.length > 0) {
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(34, 197, 94);
    pdf.text('Análisis Detallado por Persona', 20, yPosition);
    yPosition += 8;

    const eppNames: any = {
      'HEAD_COVER': 'Casco',
      'EYE_COVER': 'Gafas',
      'HAND_COVER': 'Guantes',
      'FOOT_COVER': 'Calzado',
      'FACE_COVER': 'Mascarilla',
      'EAR_COVER': 'Orejeras'
    };

    const eppToParts: any = {
      'HEAD_COVER': ['HEAD'],
      'EYE_COVER': ['FACE'],
      'FACE_COVER': ['FACE'],
      'HAND_COVER': ['LEFT_HAND', 'RIGHT_HAND'],
      'FOOT_COVER': ['FOOT', 'LEFT_FOOT', 'RIGHT_FOOT'],
      'EAR_COVER': ['HEAD']
    };

    analysisData.ProtectiveEquipment.forEach((person: any, personIdx: number) => {
      const visibleParts = new Set(person.BodyParts?.map((bp: any) => bp.Name) || []);
      const isEvaluable = epiItems.some((epp: string) => {
        const requiredParts = eppToParts[epp] || [];
        return requiredParts.some((part: string) => visibleParts.has(part));
      });

      // Header de persona
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFillColor(59, 130, 246);
      pdf.rect(20, yPosition - 3, pageWidth - 40, 10, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Persona ${personIdx + 1} - ${person.Confidence?.toFixed(1)}%`, 22, yPosition + 3);
      pdf.text(isEvaluable ? 'EVALUABLE' : 'NO EVALUABLE', pageWidth - 45, yPosition + 3);
      yPosition += 12;

      // Tabla de EPPs para esta persona
      pdf.setFillColor(229, 231, 235);
      pdf.rect(20, yPosition - 3, pageWidth - 40, 7, 'F');
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('EPP Requerido', 22, yPosition);
      pdf.text('Parte Necesaria', 70, yPosition);
      pdf.text('Detectada', 110, yPosition);
      pdf.text('EPP %', 140, yPosition);
      pdf.text('Estado', 165, yPosition);
      yPosition += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);

      epiItems.forEach((requiredEPP: string) => {
        if (yPosition > pageHeight - 25) {
          pdf.addPage();
          yPosition = 20;
        }

        const requiredParts = eppToParts[requiredEPP] || [];
        const hasRequiredPart = requiredParts.some((part: string) => visibleParts.has(part));
        const detectedPart = requiredParts.find((part: string) => visibleParts.has(part));

        let detectedEPP = null;
        let eppConfidence = 0;

        if (hasRequiredPart) {
          person.BodyParts?.forEach((bp: any) => {
            if (requiredParts.includes(bp.Name)) {
              bp.EquipmentDetections?.forEach((eq: any) => {
                if (eq.Type === requiredEPP && eq.Confidence > eppConfidence) {
                  detectedEPP = eq;
                  eppConfidence = eq.Confidence;
                }
              });
            }
          });
        }

        // Fila de datos
        pdf.setTextColor(0, 0, 0);
        pdf.text(eppNames[requiredEPP] || requiredEPP, 22, yPosition);
        pdf.text(requiredParts.join(' o '), 70, yPosition);
        
        if (hasRequiredPart) {
          pdf.setTextColor(34, 197, 94);
          pdf.text(`Si (${detectedPart})`, 110, yPosition);
        } else {
          pdf.setTextColor(156, 163, 175);
          pdf.text('No visible', 110, yPosition);
        }

        // Mostrar porcentaje siempre que haya detección
        if (detectedEPP) {
          const meetsThreshold = eppConfidence >= (analysisData.MinConfidence || 75);
          pdf.setTextColor(meetsThreshold ? 34 : 239, meetsThreshold ? 197 : 68, meetsThreshold ? 94 : 68);
          pdf.text(`${eppConfidence.toFixed(1)}%`, 140, yPosition);
        } else {
          pdf.setTextColor(156, 163, 175);
          pdf.text('-', 140, yPosition);
        }

        // Estados: No evaluable, No detectado, Cumple (verde), Bajo umbral (amarillo)
        if (!hasRequiredPart) {
          pdf.setTextColor(156, 163, 175);
          pdf.text('No evaluable', 165, yPosition);
        } else if (!detectedEPP) {
          pdf.setTextColor(239, 68, 68);
          pdf.text('No detectado', 165, yPosition);
        } else if (eppConfidence >= (analysisData.MinConfidence || analysisData.Summary?.minConfidence || 75)) {
          pdf.setTextColor(34, 197, 94);
          pdf.text(`Cumple ${eppConfidence.toFixed(0)}%`, 165, yPosition);
        } else {
          pdf.setTextColor(251, 191, 36);
          pdf.text(`Bajo umbral ${eppConfidence.toFixed(0)}%`, 165, yPosition);
        }

        yPosition += 6;
      });

      yPosition += 4;
    });

    // Nota explicativa
    if (yPosition > pageHeight - 30) {
      pdf.addPage();
      yPosition = 20;
    }
    pdf.setFillColor(254, 243, 199);
    pdf.rect(20, yPosition - 3, pageWidth - 40, 18, 'F');
    pdf.setTextColor(146, 64, 14);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Nota:', 22, yPosition);
    pdf.setFont('helvetica', 'normal');
    const noteText = 'Un EPP solo es evaluable si primero se detecta la parte del cuerpo necesaria. Por ejemplo, aunque un casco sea visible, si no se detecta la cabeza de la persona, ese EPP no puede ser evaluado.';
    const noteLines = pdf.splitTextToSize(noteText, pageWidth - 48);
    yPosition += 4;
    noteLines.forEach((line: string) => {
      pdf.text(line, 22, yPosition);
      yPosition += 4;
    });
    yPosition += 6;
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
        // Usar fetch para obtener la imagen como blob y convertir a base64
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        const reader = new FileReader();
        
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        
        // Crear imagen temporal para obtener dimensiones reales
        const img = new Image();
        img.src = base64;
        
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
        
        const imgX = (pageWidth - imgWidth) / 2;
        pdf.addImage(base64, 'JPEG', imgX, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 10;
      } catch (imgError) {
        console.error('Error cargando imagen en PDF:', imgError);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(200, 0, 0);
        pdf.text('No se pudo cargar la imagen en el PDF.', 20, yPosition);
        yPosition += 10;
      }
    } catch (error) {
      console.log('Error procesando imagen:', error);
    }
  }

  // Footer corporativo moderno
  const footerY = pageHeight - 20;
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, footerY - 5, pageWidth, 25, 'F');
  pdf.setFillColor(102, 126, 234);
  pdf.rect(pageWidth / 2, footerY - 5, pageWidth / 2, 25, 'F');
  
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
