# Bug Crítico: Detección Incorrecta de Personas y EPP

**Fecha:** 31/10/2024  
**Versión Afectada:** v2.5.2  
**Severidad:** 🔴 ALTA

---

## 🐛 Descripción del Problema

### Caso Real Analizado:
- **Imagen:** Control de tránsito con 6-8 personas
- **Personas visibles completas:** 5
- **Personas parciales:** 2-3 (dentro de auto, casi no visible)
- **Problema:** Sistema reporta 8 personas con calzado

### Problema Identificado:
AWS Rekognition detecta 8 personas, pero:
1. **NO todas tienen `FOOT` en `BodyParts`** (pies no visibles)
2. **AÚN ASÍ reporta `FOOT_COVER`** para esas personas
3. **Nuestra lógica v2.5.1 NO filtra estas personas**

---

## 🔍 Análisis Técnico

### Flujo Actual (INCORRECTO):
```javascript
// 1. AWS Rekognition detecta 8 personas
ProtectiveEquipment.length = 8

// 2. Para cada persona, revisamos BodyParts
person.BodyParts = [
  { Name: "HEAD", EquipmentDetections: [...] },
  { Name: "FACE", EquipmentDetections: [...] },
  { Name: "LEFT_HAND", EquipmentDetections: [...] }
  // ❌ NO hay "FOOT" en BodyParts
]

// 3. Pero EquipmentDetections puede tener FOOT_COVER
EquipmentDetections = [
  { Type: "FOOT_COVER", Confidence: 85 }  // ❌ FALSO POSITIVO
]

// 4. Nuestra lógica actual:
if (epp === 'FOOT_COVER') return visibleBodyParts.has('FOOT');
// ✅ Esto funciona para FILTRAR EPPs evaluables

// ❌ PERO NO FILTRA LA PERSONA del conteo total
totalPersons = 8  // Incluye personas sin pies visibles
```

### Problema Raíz:
**AWS Rekognition puede detectar EPP sin detectar la parte del cuerpo correspondiente**

Esto ocurre cuando:
- Persona está muy lejos
- Persona parcialmente visible
- Persona dentro de vehículo
- Oclusión parcial

---

## ✅ Solución Propuesta

### Estrategia 1: Filtrar Personas No Evaluables (RECOMENDADA)
```javascript
// Filtrar personas que NO tienen suficientes partes visibles
const evaluablePersons = ProtectiveEquipment.filter((person: any) => {
  const visibleParts = new Set<string>();
  person.BodyParts?.forEach((part: any) => {
    visibleParts.add(part.Name);
  });
  
  // Criterios para considerar persona evaluable:
  // 1. Al menos 2 partes del cuerpo visibles
  // 2. O tiene al menos una parte relevante (HEAD, FACE, HAND)
  const relevantParts = ['HEAD', 'FACE', 'LEFT_HAND', 'RIGHT_HAND'];
  const hasRelevantPart = relevantParts.some(p => visibleParts.has(p));
  
  return visibleParts.size >= 2 && hasRelevantPart;
});

// Usar evaluablePersons.length en lugar de totalPersons
const totalEvaluablePersons = evaluablePersons.length;
```

### Estrategia 2: Validar Coherencia EPP-BodyPart
```javascript
// Solo contar EPP si la parte del cuerpo está presente
person.BodyParts?.forEach((part: any) => {
  const partName = part.Name;
  
  part.EquipmentDetections?.forEach((eq: any) => {
    // Validar que el EPP corresponde a la parte del cuerpo
    const isValid = validateEPPForBodyPart(eq.Type, partName);
    
    if (isValid && eq.Confidence >= minConfidence) {
      personEPPs.add(eq.Type);
    }
  });
});

function validateEPPForBodyPart(eppType: string, bodyPart: string): boolean {
  const validCombinations: any = {
    'HEAD_COVER': ['HEAD'],
    'EYE_COVER': ['FACE', 'HEAD'],
    'FACE_COVER': ['FACE'],
    'HAND_COVER': ['LEFT_HAND', 'RIGHT_HAND'],
    'FOOT_COVER': ['FOOT'],  // ❌ Si no hay FOOT, no contar FOOT_COVER
    'EAR_COVER': ['HEAD']
  };
  
  return validCombinations[eppType]?.includes(bodyPart) || false;
}
```

### Estrategia 3: Filtrar por Tamaño de BoundingBox
```javascript
// Filtrar personas muy pequeñas (muy lejos o parcialmente visibles)
const MIN_BOUNDING_BOX_AREA = 0.01; // 1% del área de la imagen

const evaluablePersons = ProtectiveEquipment.filter((person: any) => {
  const bbox = person.BoundingBox;
  if (!bbox) return false;
  
  const area = bbox.Width * bbox.Height;
  return area >= MIN_BOUNDING_BOX_AREA;
});
```

---

## 🎯 Implementación v2.5.3

### Cambios en `generateLocalAISummary()`:

1. **Filtrar personas evaluables** antes de procesar
2. **Validar coherencia** EPP-BodyPart
3. **Agregar métricas** de personas filtradas
4. **Actualizar resumen** con información clara

### Métricas a Reportar:
```javascript
{
  totalPersonsDetected: 8,        // Total detectado por Rekognition
  evaluablePersons: 5,            // Personas con suficientes partes visibles
  filteredPersons: 3,             // Personas excluidas del análisis
  filterReasons: {
    tooSmall: 1,                  // Muy lejos/pequeña
    insufficientParts: 2          // Pocas partes visibles
  }
}
```

### Mensaje en Resumen:
```
⚠️ **Nota importante**: Se detectaron 8 personas en la imagen, pero solo 5 
pudieron ser evaluadas completamente. 3 personas fueron excluidas del análisis 
por estar parcialmente visibles o muy lejos de la cámara.

**Personas evaluables:** 5
**Personas excluidas:** 3 (dentro de vehículo, muy lejos, o parcialmente visibles)
```

---

## 📋 Plan de Acción

### Fase 1: Corrección Inmediata (v2.5.3 - 30 min)
- [ ] Implementar filtro de personas evaluables
- [ ] Validar coherencia EPP-BodyPart
- [ ] Actualizar cálculos con personas filtradas
- [ ] Mejorar mensajes en resumen

### Fase 2: Testing (15 min)
- [ ] Probar con imagen problemática
- [ ] Verificar que reporta 5 personas evaluables
- [ ] Confirmar que excluye 3 personas
- [ ] Validar que solo cuenta FOOT_COVER para personas con FOOT visible

### Fase 3: Deploy (5 min)
- [ ] Commit y push v2.5.3
- [ ] Verificar deploy en Amplify
- [ ] Probar en producción

---

## 🔧 Código a Modificar

**Archivo:** `/epi-dashboard/src/App.tsx`  
**Función:** `generateLocalAISummary()`  
**Líneas:** ~105-250

**Cambios:**
1. Agregar función `filterEvaluablePersons()`
2. Agregar función `validateEPPForBodyPart()`
3. Actualizar lógica de conteo
4. Mejorar mensajes de resumen

---

## ✅ Criterios de Éxito

1. ✅ Imagen con 6-8 personas reporta 5 evaluables
2. ✅ No cuenta FOOT_COVER para personas sin FOOT visible
3. ✅ Resumen explica cuántas personas fueron excluidas
4. ✅ Cálculo de cumplimiento basado en personas evaluables
5. ✅ PDF refleja información correcta

---

**Próximo Paso:** Implementar correcciones en v2.5.3
