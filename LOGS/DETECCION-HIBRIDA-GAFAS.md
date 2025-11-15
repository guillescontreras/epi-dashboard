# Detección Híbrida de Gafas - Documentación Técnica

## Fecha de Implementación
**02/11/2024**

## Problema Identificado

### Limitación de DetectLabels
- **DetectLabels** solo detectaba **1 instancia de "Glasses"** aunque hubiera múltiples personas con gafas
- En imagen con 3 personas usando gafas, solo detectaba las gafas de 1 persona
- DetectLabels NO está diseñado para detectar múltiples instancias de objetos pequeños como gafas

### Comparación con Calzado
- **Calzado (Shoe/Footwear):** DetectLabels SÍ detecta múltiples instancias ✅
- **Gafas (Glasses):** DetectLabels solo detecta 1 instancia ❌
- **Razón:** Objetos más grandes y separados espacialmente son mejor detectados

## Solución Implementada

### Cambio de API: DetectLabels → DetectFaces

**DetectFaces con atributo Eyeglasses:**
- Detecta gafas por cada rostro individual
- Confianza muy alta (>99%)
- Detecta TODAS las personas con gafas en la imagen

### Algoritmo de Mapeo: Distancia Mínima

**Problema inicial:**
- Mapeo por "contención" (isInsideBox) fallaba cuando BoundingBoxes se solapaban
- Rostros se asignaban incorrectamente a personas

**Solución:**
```javascript
// Calcular centro del rostro
const faceCenterX = face.BoundingBox.Left + face.BoundingBox.Width / 2;
const faceCenterY = face.BoundingBox.Top + face.BoundingBox.Height / 2;

// Buscar persona MÁS CERCANA
let closestPerson = null;
let minDistance = Infinity;

detectionResult.Persons.forEach(person => {
  const personCenterX = person.BoundingBox.Left + person.BoundingBox.Width / 2;
  const personCenterY = person.BoundingBox.Top + person.BoundingBox.Height / 2;
  
  const distance = Math.sqrt(
    Math.pow(faceCenterX - personCenterX, 2) + 
    Math.pow(faceCenterY - personCenterY, 2)
  );
  
  if (distance < minDistance) {
    minDistance = distance;
    closestPerson = person;
  }
});
```

## Arquitectura de Detección Híbrida Actualizada

### Métodos de Detección por EPP

| EPP | Método | API Rekognition | Razón |
|-----|--------|-----------------|-------|
| **HEAD_COVER** (Casco) | Nativo | DetectProtectiveEquipment | Soportado nativamente |
| **HAND_COVER** (Guantes) | Nativo | DetectProtectiveEquipment | Soportado nativamente |
| **FACE_COVER** (Mascarilla) | Nativo | DetectProtectiveEquipment | Soportado nativamente |
| **EYE_COVER** (Gafas) | **Faces** | **DetectFaces** | Detecta por rostro individual ✨ |
| **FOOT_COVER** (Calzado) | Labels | DetectLabels | Múltiples instancias detectadas |
| **EAR_COVER** (Orejeras) | Labels | DetectLabels | No soportado nativamente |

### Flujo de Detección

```
1. DetectProtectiveEquipment (MinConfidence: 50%)
   └─> Detecta: HEAD_COVER, HAND_COVER, FACE_COVER

2. DetectFaces (Attributes: ['ALL'])
   └─> Detecta: Eyeglasses por cada rostro
   └─> Mapeo: Algoritmo de distancia mínima rostro→persona

3. DetectLabels (MinConfidence: 50%, MaxLabels: 50)
   └─> Detecta: Shoe/Footwear, Headphones
   └─> Mapeo: Centro del objeto dentro de BoundingBox de persona
```

## Resultados de Pruebas

### Caso de Prueba: 3 Personas con Gafas

**Antes (DetectLabels):**
- Rostro 0 → Persona 0 ✅
- Rostro 1 → Persona 0 ❌ (duplicado)
- Rostro 2 → Persona 1 ✅
- **Resultado:** 2 de 3 personas con gafas detectadas

**Después (DetectFaces + Distancia Mínima):**
- Rostro 0 → Persona 0 (distancia: 0.1707) - Gafas: 99.99996% ✅
- Rostro 1 → Persona 1 (distancia: 0.2836) - Gafas: 99.87394% ✅
- Rostro 2 → Persona 2 (distancia: 0.3358) - Gafas: 99.99866% ✅
- **Resultado:** 3 de 3 personas con gafas detectadas ✅

## Código Actualizado

### Lambda Function
- **Nombre en AWS:** `rekognition-processor`
- **Ubicación local:** `/Rekognition/lambda-deteccion-seguridad/lambda_nodeJS/lambda-epi-function/index.mjs`
- **Última actualización:** 02/11/2024 05:45 UTC

### Cambios Clave

1. **Agregada llamada a DetectFaces:**
```javascript
const facesResult = await rekognition.send(new DetectFacesCommand({
  Image: params.Image,
  Attributes: ['ALL']
}));
```

2. **Eliminado EYE_COVER de labelMapping:**
```javascript
const labelMapping = {
  FOOT_COVER: ['Footwear', 'Shoe', 'Shoes', 'Boot', 'Boots', 'Safety Boots'],
  EAR_COVER: ['Headphones', 'Earmuffs', 'Ear Protection', 'Hearing Protection']
  // EYE_COVER removido - ahora usa DetectFaces
};
```

3. **Implementado algoritmo de distancia mínima:**
- Calcula distancia euclidiana entre centros
- Asigna rostro a persona más cercana
- Logs incluyen distancia calculada para debugging

## Ventajas de la Solución

1. ✅ **Detección completa:** Todas las personas con gafas son detectadas
2. ✅ **Alta confianza:** >99% en todas las detecciones
3. ✅ **Mapeo preciso:** Algoritmo de distancia mínima evita duplicados
4. ✅ **Escalable:** Funciona con cualquier número de personas
5. ✅ **Robusto:** No depende de BoundingBoxes que no se solapen

## Limitaciones Conocidas

1. **DetectFaces requiere rostros visibles:** Si el rostro está muy tapado, no detectará gafas
2. **Costo adicional:** DetectFaces es una llamada adicional a Rekognition
3. **Personas sin rostro visible:** No se les pueden detectar gafas

## Mantenimiento

### Sincronización de Código
- **AWS Lambda:** Actualizar vía VS Code AWS Toolkit
- **Código local:** Mantener sincronizado en `/Rekognition/lambda-deteccion-seguridad/`

### Logs de Debugging
```bash
aws logs tail /aws/lambda/rekognition-processor --follow
```

Buscar:
- `[HYBRID] Rostro X: Gafas detectadas`
- `[HYBRID] Rostro X más cercano a Persona Y (distancia: Z)`

## Próximos Pasos Potenciales

1. **Optimización:** Cachear resultados de DetectFaces si se usa múltiples veces
2. **Fallback:** Si DetectFaces falla, intentar con DetectLabels como backup
3. **Métricas:** Monitorear tasa de detección de gafas vs otros EPPs
4. **Validación:** Comparar resultados con validación manual en dataset de prueba

---

**Documentado por:** Amazon Q Developer  
**Fecha:** 02/11/2024  
**Versión Lambda:** Latest (desplegada 05:45 UTC)
