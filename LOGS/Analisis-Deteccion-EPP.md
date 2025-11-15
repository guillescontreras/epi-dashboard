# Análisis de Problemas en Detección de EPP

**Fecha:** 31/10/2024  
**Versión Actual:** v2.5.2  
**Informe Analizado:** Informe-EPP-Guillermo-Sebastian-Contreras-2025-10-31-0335.pdf  
**Captura:** captura.png (2274x1528px)

---

## 🔍 Problemas Identificados

### 1. Inconsistencias en Detección de Personas
**Problema:** El número de personas detectadas no coincide con la realidad de la imagen

**Posibles Causas:**
- AWS Rekognition detecta personas parcialmente visibles
- Umbral de confianza muy bajo permite falsos positivos
- Personas en segundo plano o reflejos son contadas
- Oclusión parcial genera múltiples detecciones de la misma persona

**Impacto:** 
- Informes con datos incorrectos
- Cálculos de cumplimiento erróneos
- Pérdida de confianza del usuario

---

### 2. Inconsistencias en Detección de EPP
**Problema:** Elementos de protección no detectados o detectados incorrectamente

**Posibles Causas:**

#### A) Limitaciones del Modelo AWS Rekognition
- **EPPs que detecta bien:**
  - HEAD_COVER (Casco) ✅
  - HAND_COVER (Guantes) ✅
  - FACE_COVER (Mascarilla) ✅
  
- **EPPs con detección limitada:**
  - EYE_COVER (Gafas) ⚠️ - Difícil si hay mascarilla
  - FOOT_COVER (Calzado) ⚠️ - Requiere pies visibles
  - EAR_COVER (Orejeras) ⚠️ - Muy difícil de detectar

#### B) Problemas de Calidad de Imagen
- Resolución insuficiente
- Ángulo de cámara desfavorable
- Iluminación inadecuada
- Distancia excesiva de la cámara
- Oclusión por otros objetos/personas

#### C) Problemas de Configuración
- Umbral de confianza (minConfidence) muy alto o muy bajo
- Selección de EPPs no apropiada para el contexto
- No se considera si la parte del cuerpo está visible

---

## 🛠️ Soluciones Propuestas

### Solución 1: Mejorar Filtrado de Personas (ALTA PRIORIDAD)
**Objetivo:** Detectar solo personas relevantes en primer plano

**Implementación:**
```javascript
// Filtrar personas por:
1. Tamaño del BoundingBox (eliminar personas muy pequeñas/lejanas)
2. Confianza mínima de detección (>90%)
3. Cantidad de partes del cuerpo visibles (mínimo 3)
4. Posición en la imagen (priorizar centro/primer plano)
```

**Beneficios:**
- Reduce falsos positivos
- Mejora precisión del informe
- Análisis más relevante

---

### Solución 2: Validación Inteligente de EPP (IMPLEMENTADA PARCIALMENTE)
**Estado:** Ya implementamos detección de partes visibles en v2.5.1

**Mejoras Adicionales Necesarias:**
```javascript
// Agregar validación de calidad de detección:
1. Verificar tamaño del BoundingBox del EPP
2. Validar que el EPP esté en la parte correcta del cuerpo
3. Considerar contexto (ej: si hay casco, probablemente hay más EPP)
4. Implementar lógica de "EPP probablemente presente pero no detectado"
```

---

### Solución 3: Ajuste Dinámico de Confianza (NUEVA)
**Objetivo:** Adaptar umbral según tipo de EPP

**Implementación:**
```javascript
const confidenceThresholds = {
  HEAD_COVER: 80,    // Cascos son fáciles de detectar
  HAND_COVER: 75,    // Guantes medianos
  FACE_COVER: 85,    // Mascarillas claras
  EYE_COVER: 70,     // Gafas más difíciles
  FOOT_COVER: 70,    // Calzado difícil
  EAR_COVER: 65      // Orejeras muy difíciles
};
```

**Beneficios:**
- Mejor balance entre precisión y recall
- Menos falsos negativos en EPPs difíciles
- Menos falsos positivos en EPPs fáciles

---

### Solución 4: Advertencias Contextuales en Informe (NUEVA)
**Objetivo:** Informar al usuario sobre limitaciones de la detección

**Implementación:**
```javascript
// Agregar al resumen IA:
- "⚠️ Calidad de imagen: [Baja/Media/Alta]"
- "⚠️ Distancia de cámara: [Muy lejos/Lejos/Óptima/Cerca]"
- "⚠️ Personas parcialmente visibles: X"
- "⚠️ EPPs difíciles de detectar en esta imagen: [lista]"
- "💡 Recomendación: Tomar foto más cercana / Mejor iluminación"
```

---

### Solución 5: Modo de Análisis Estricto vs Permisivo (NUEVA)
**Objetivo:** Dar control al usuario sobre sensibilidad

**Opciones:**
- **Modo Estricto:** Solo cuenta EPP con alta confianza (>85%)
- **Modo Balanceado:** Confianza media (>75%) - ACTUAL
- **Modo Permisivo:** Confianza baja (>65%) para EPPs difíciles

---

## 📊 Métricas de Calidad de Detección

### Indicadores a Implementar:
```javascript
{
  imageQuality: {
    resolution: "Alta/Media/Baja",
    lighting: "Buena/Regular/Mala",
    distance: "Óptima/Aceptable/Muy lejos",
    angle: "Frontal/Lateral/Cenital"
  },
  detectionQuality: {
    personsConfidence: 95,  // Promedio de confianza
    eppConfidence: 82,      // Promedio de confianza
    visibleBodyParts: 4,    // De 6 posibles
    occlusionLevel: "Bajo"  // Bajo/Medio/Alto
  },
  recommendations: [
    "Acercarse más a los trabajadores",
    "Mejorar iluminación del área",
    "Tomar foto desde ángulo frontal"
  ]
}
```

---

## 🎯 Plan de Implementación

### Fase 1: Análisis de Caso Específico (AHORA)
1. ✅ Revisar informe PDF problemático
2. ✅ Analizar captura de pantalla
3. ⏳ Identificar qué falló específicamente
4. ⏳ Documentar patrón del problema

### Fase 2: Mejoras Rápidas (v2.5.3 - 1 hora)
1. Filtrar personas por tamaño de BoundingBox
2. Aumentar confianza mínima para personas (>90%)
3. Agregar advertencia de "personas parcialmente visibles"
4. Mejorar mensajes en resumen IA

### Fase 3: Mejoras Avanzadas (v2.6.0 - 2-3 horas)
1. Implementar umbrales dinámicos por tipo de EPP
2. Agregar métricas de calidad de imagen
3. Implementar recomendaciones contextuales
4. Crear modo Estricto/Balanceado/Permisivo

### Fase 4: Testing y Validación (v2.6.1)
1. Probar con 10-20 imágenes variadas
2. Comparar resultados antes/después
3. Ajustar parámetros según feedback
4. Documentar casos límite

---

## 📝 Preguntas para el Usuario

Para implementar las mejoras correctas, necesito saber:

1. **¿Cuántas personas había realmente en la imagen?**
2. **¿Qué EPPs estaban usando las personas?**
3. **¿Qué EPPs NO detectó el sistema?**
4. **¿Detectó personas que no existían?**
5. **¿La foto fue tomada de cerca o de lejos?**
6. **¿La iluminación era buena?**
7. **¿Las personas estaban de frente o de lado?**

---

## 🔧 Código Actual a Revisar

### Archivos Clave:
1. `/epi-dashboard/src/App.tsx` - Función `generateLocalAISummary()`
2. Lambda `analyze-image` - Llamada a AWS Rekognition
3. `/epi-dashboard/src/utils/pdfGenerator.ts` - Generación de informes

### Parámetros Actuales:
- `minConfidence`: 75% (configurable por usuario)
- `epiItems`: Selección manual de EPPs
- Filtrado de partes visibles: ✅ Implementado en v2.5.1

---

## 💡 Recomendaciones Inmediatas

1. **Revisar el informe PDF específico** para entender qué falló
2. **Analizar la captura de pantalla** para ver la imagen original
3. **Implementar filtrado de personas** por tamaño/confianza
4. **Agregar advertencias** sobre limitaciones de detección
5. **Documentar casos problemáticos** para mejorar el modelo

---

**Próximo Paso:** Necesito que me describas qué viste en el informe y la imagen para implementar las correcciones específicas.
