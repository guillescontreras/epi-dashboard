// Capacidades de detección de EPPs
export interface EPPCapability {
  type: string;
  label: string;
  icon: string;
  autoDetection: boolean;
  detectionMethod: 'NATIVE' | 'LABEL_DETECTION' | 'MANUAL';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  note?: string;
}

export const EPP_DETECTION_CAPABILITIES: Record<string, EPPCapability> = {
  HEAD_COVER: {
    type: 'HEAD_COVER',
    label: 'Casco',
    icon: '🪖',
    autoDetection: true,
    detectionMethod: 'NATIVE',
    confidence: 'HIGH',
    note: 'Detección nativa de AWS Rekognition'
  },
  HAND_COVER: {
    type: 'HAND_COVER',
    label: 'Guantes',
    icon: '🧤',
    autoDetection: true,
    detectionMethod: 'NATIVE',
    confidence: 'HIGH',
    note: 'Detección nativa de AWS Rekognition'
  },
  FACE_COVER: {
    type: 'FACE_COVER',
    label: 'Mascarilla',
    icon: '😷',
    autoDetection: true,
    detectionMethod: 'NATIVE',
    confidence: 'HIGH',
    note: 'Detección nativa de AWS Rekognition'
  },
  EYE_COVER: {
    type: 'EYE_COVER',
    label: 'Gafas de Seguridad',
    icon: '🥽',
    autoDetection: true,
    detectionMethod: 'LABEL_DETECTION',
    confidence: 'MEDIUM',
    note: 'Detectado mediante reconocimiento de objetos generales'
  },
  FOOT_COVER: {
    type: 'FOOT_COVER',
    label: 'Calzado de Seguridad',
    icon: '🥾',
    autoDetection: true,
    detectionMethod: 'LABEL_DETECTION',
    confidence: 'MEDIUM',
    note: 'Detectado mediante reconocimiento de objetos generales'
  },
  EAR_COVER: {
    type: 'EAR_COVER',
    label: 'Protección Auditiva',
    icon: '🎧',
    autoDetection: true,
    detectionMethod: 'LABEL_DETECTION',
    confidence: 'MEDIUM',
    note: 'Detectado mediante reconocimiento de objetos generales'
  }
};

export const getDetectionMethodLabel = (method: 'NATIVE' | 'LABEL_DETECTION' | 'MANUAL'): string => {
  const labels = {
    NATIVE: 'Detección Nativa',
    LABEL_DETECTION: 'Detección por Objetos',
    MANUAL: 'Validación Manual'
  };
  return labels[method];
};

export const getConfidenceBadgeColor = (confidence: 'HIGH' | 'MEDIUM' | 'LOW'): string => {
  const colors = {
    HIGH: 'bg-green-100 text-green-800 border-green-300',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    LOW: 'bg-orange-100 text-orange-800 border-orange-300'
  };
  return colors[confidence];
};
