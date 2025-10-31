export const APP_VERSION = '2.6.8';

// Historial de versiones
export const VERSION_HISTORY = {
  '2.6.8': 'Fix: Carga de imagen en PDF usando fetch en lugar de canvas (evita CORS)',
  '2.6.7': 'Fix: Mejorada carga de imágenes en PDF con timeout y mejor manejo de errores',
  '2.6.6': 'Fix: Imagen en PDF ahora mantiene aspect ratio correcto (no se estira)',
  '2.6.5': 'Fix crítico: Tabla EPP ahora muestra todas las detecciones sin filtros restrictivos',
  '2.6.4': 'Fix crítico: Tabla EPP visible inmediatamente después del análisis, PDF con imagen única',
  '2.6.3': 'Fix: Tabla EPP visible después de análisis, imagen única en PDF',
  '2.6.2': 'Fix: Imágenes en PDF funcionando - acceso público S3 output',
  '2.6.1': 'Fix: Footer PDF sin teléfono, EPPs en informe historial, mejor carga imágenes',
  '2.6.0': 'PDF completo: logo, imágenes comparativas, footer corporativo',
  '2.5.9': 'Correcciones UX: EPPs en historial, timing resultados, feedback reposicionado',
  '2.5.8': 'EPPs seleccionados en historial/PDF + botón reportar errores',
  '2.5.7': 'Evaluación parcial: persona evaluable si tiene AL MENOS UNA parte visible',
  '2.5.6': 'Filtrado dinámico correcto: evalúa según EPPs requeridos',
  '2.5.5': 'Filtrado ESTRICTO: solo personas con FOOT visible (cuerpo completo)',
  '2.5.4': 'Filtrado completo: Lambda Bedrock + tabla detalles EPP',
  '2.5.3': 'Filtrado inteligente de personas: solo evalúa personas con partes visibles',
  '2.5.2': 'Modo avanzado deshabilitado temporalmente (inconsistencias en historial)',
  '2.5.1': 'Correcciones críticas: modo avanzado, evaluación inteligente EPP, modal feedback',
  '2.5.0': 'Formulario de contacto con tabs + FAQ corregido',
  '2.4.3': 'Sistema de feedback post-análisis',
  '2.4.2': 'Sección FAQ con 12 preguntas frecuentes',
  '2.4.1': 'Validación de seguridad en Lambdas + Rate limiting',
  '2.4.0': 'Listas geográficas en cascada para perfil de usuario',
  '2.3.3': 'Correcciones críticas: PDFs únicos, eliminar análisis, deshabilitar PDF no-EPP',
  '2.3.2': 'Edición de perfil desde menú usuario',
  '2.3.1': 'Correcciones API Gateway y permisos IAM',
  '2.3.0': 'Resúmenes IA con Claude 3 Haiku y exportación PDF',
  '2.2.0': 'Integración completa con AWS (Cognito, DynamoDB)',
  '2.1.1': 'Optimizaciones de UX y flujo del asistente',
  '2.1.0': 'Análisis de video y detección en tiempo real',
  '2.0.0': 'Rediseño completo con branding CoironTech',
  '1.1.0': 'Multi-detección (rostros, texto, objetos)',
  '1.0.0': 'Release inicial'
};

// Fecha de última actualización
export const LAST_UPDATE = '2024-11-01';
