import json
import boto3
import base64

bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

def lambda_handler(event, context):
    try:
        body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        
        analysis_results = body.get('analysisResults', {})
        image_url = body.get('imageUrl', '')
        required_epps = body.get('requiredEPPs', [])
        
        # Extraer datos del análisis
        summary = analysis_results.get('Summary', {})
        total_persons_detected = summary.get('totalPersons', 0)
        min_confidence = analysis_results.get('MinConfidence', 75)
        protective_equipment = analysis_results.get('ProtectiveEquipment', [])
        
        # FILTRAR PERSONAS EVALUABLES
        # Persona es evaluable si tiene AL MENOS UNA parte visible de los EPPs requeridos
        def is_evaluable_person(person):
            visible_parts = set()
            for body_part in person.get('BodyParts', []):
                visible_parts.add(body_part.get('Name'))
            
            # Mapeo de EPP a partes del cuerpo necesarias
            epp_to_parts = {
                'HEAD_COVER': ['HEAD'],
                'EYE_COVER': ['FACE'],
                'FACE_COVER': ['FACE'],
                'HAND_COVER': ['LEFT_HAND', 'RIGHT_HAND'],
                'FOOT_COVER': ['FOOT'],
                'EAR_COVER': ['HEAD']
            }
            
            # Verificar que tenga AL MENOS UNA parte necesaria para ALGUNO de los EPPs requeridos
            for epp in required_epps:
                required_parts = epp_to_parts.get(epp, [])
                if any(part in visible_parts for part in required_parts):
                    return True
            return False
        
        evaluable_persons = [p for p in protective_equipment if is_evaluable_person(p)]
        total_persons = len(evaluable_persons)
        filtered_persons = total_persons_detected - total_persons
        
        # Validar coherencia EPP-BodyPart
        def validate_epp_for_bodypart(epp_type, body_part):
            valid_combinations = {
                'HEAD_COVER': ['HEAD'],
                'EYE_COVER': ['FACE', 'HEAD'],
                'FACE_COVER': ['FACE'],
                'HAND_COVER': ['LEFT_HAND', 'RIGHT_HAND'],
                'FOOT_COVER': ['FOOT', 'LEFT_FOOT', 'RIGHT_FOOT'],
                'EAR_COVER': ['HEAD']
            }
            return body_part in valid_combinations.get(epp_type, [])
        
        # Analizar EPPs detectados (solo personas evaluables)
        epp_detected = {}
        compliant = 0
        for person in evaluable_persons:
            person_epps = set()
            for body_part in person.get('BodyParts', []):
                body_part_name = body_part.get('Name')
                for equipment in body_part.get('EquipmentDetections', []):
                    epp_type = equipment.get('Type')
                    confidence = equipment.get('Confidence', 0)
                    # Solo contar si confianza suficiente Y corresponde a la parte del cuerpo
                    if confidence >= min_confidence and validate_epp_for_bodypart(epp_type, body_part_name):
                        person_epps.add(epp_type)
                        epp_detected[epp_type] = epp_detected.get(epp_type, 0) + 1
            
            # Verificar si persona cumple con todos los EPPs requeridos
            if required_epps and all(epp in person_epps for epp in required_epps):
                compliant += 1
        
        # Mapeo de nombres
        epp_names = {
            'HEAD_COVER': 'Casco',
            'EYE_COVER': 'Gafas de seguridad',
            'HAND_COVER': 'Guantes',
            'FOOT_COVER': 'Calzado de seguridad',
            'FACE_COVER': 'Mascarilla',
            'EAR_COVER': 'Protección auditiva'
        }
        
        # DEBUG: Imprimir datos recibidos
        print(f"DEBUG - Total personas evaluables: {total_persons}")
        print(f"DEBUG - Min confidence: {min_confidence}")
        print(f"DEBUG - Required EPPs: {required_epps}")
        
        # FILTRAR solo EPPs requeridos
        detected_list = [f"{epp_names.get(k, k)}: {v}/{total_persons} personas evaluables" for k, v in epp_detected.items() if k in required_epps]
        detected_str = "\n".join(detected_list) if detected_list else "Ninguno"
        
        # Usar EPPs requeridos del frontend
        total_epp_types = len(required_epps) if required_epps else 6
        detected_epp_types = sum(1 for epp in required_epps if epp in epp_detected) if required_epps else len(epp_detected)
        
        # Identificar EPPs faltantes y bajo umbral
        missing_epps = [epp_names.get(epp, epp) for epp in required_epps if epp not in epp_detected] if required_epps else []
        missing_str = ", ".join(missing_epps) if missing_epps else "Ninguno"
        
        # Detectar EPPs que NO cumplen umbral (detectados pero < min_confidence)
        # Incluye TODOS los EPPs detectados bajo umbral, sin importar si ya están en epp_detected
        below_threshold_epps = {}
        below_threshold_max_conf = {}  # Guardar máxima confianza de cada EPP bajo umbral
        
        for person in evaluable_persons:
            for body_part in person.get('BodyParts', []):
                body_part_name = body_part.get('Name')
                for equipment in body_part.get('EquipmentDetections', []):
                    epp_type = equipment.get('Type')
                    confidence = equipment.get('Confidence', 0)
                    if validate_epp_for_bodypart(epp_type, body_part_name) and epp_type in required_epps:
                        if confidence < min_confidence:
                            print(f"DEBUG - EPP bajo umbral encontrado: {epp_type} con {confidence}% en {body_part_name}")
                            below_threshold_epps[epp_type] = below_threshold_epps.get(epp_type, 0) + 1
                            # Guardar la máxima confianza detectada para este EPP
                            if epp_type not in below_threshold_max_conf or confidence > below_threshold_max_conf[epp_type]:
                                below_threshold_max_conf[epp_type] = confidence
        
        below_threshold_list = [f"{epp_names.get(k, k)}: {v} detección(es) con {below_threshold_max_conf[k]:.1f}% (NO cumplen umbral {min_confidence}%)" for k, v in below_threshold_epps.items()]
        below_threshold_str = "\n".join(below_threshold_list) if below_threshold_list else "Ninguno"
        
        # DEBUG: Imprimir EPPs bajo umbral detectados
        print(f"DEBUG - EPPs bajo umbral detectados: {below_threshold_epps}")
        print(f"DEBUG - Confianzas máximas: {below_threshold_max_conf}")
        print(f"DEBUG - String para prompt: {below_threshold_str}")
        
        # Calcular porcentajes
        person_compliance_percentage = round((compliant / total_persons * 100)) if total_persons > 0 else 0
        epp_compliance_percentage = round((detected_epp_types / total_epp_types * 100)) if total_epp_types > 0 else 0
        
        # Información sobre filtrado
        filter_info = ""
        if filtered_persons > 0:
            filter_info = f"\n- Personas excluidas del análisis: {filtered_persons} (parcialmente visibles, muy lejos, o en vehículos)"
        
        # Información sobre personas no evaluables
        non_evaluable_info = ""
        if filtered_persons > 0:
            non_evaluable_info = f"""

IMPORTANTE - PERSONAS NO EVALUABLES:
- {filtered_persons} persona(s) fueron excluidas del análisis
- Razón: Para evaluar un EPP, primero debe detectarse la parte del cuerpo correspondiente
- Ejemplos:
  * Casco requiere detección de CABEZA
  * Guantes requieren detección de MANOS
  * Gafas/Mascarilla requieren detección de ROSTRO
- Aunque los EPP sean visibles, si las partes del cuerpo no se detectan (personas lejos, parcialmente visibles, dentro de vehículos), NO pueden evaluarse
- Esto NO es un error del sistema, es una limitación técnica necesaria para garantizar precisión

RECOMENDACIONES PARA MEJORAR LA DETECCIÓN:
1. Distancia: Tomar fotos a 3-5 metros de las personas
2. Ángulo: Usar tomas frontales o con ángulo de 45° máximo
3. Encuadre: Capturar personas de cuerpo completo
4. Iluminación: Evitar contraluz y sombras fuertes
5. Obstrucciones: Evitar que vehículos, equipos u objetos tapen a las personas
6. Enfoque: Verificar que la imagen no esté borrosa
"""
        
        # Construir sección de personas no evaluables
        non_evaluable_section = ""
        if filtered_persons > 0:
            non_evaluable_section = f"""**⚠️ POR QUÉ ALGUNAS PERSONAS NO SON EVALUABLES**
Se excluyeron {filtered_persons} persona(s) porque no se detectaron las partes del cuerpo necesarias para evaluar los EPP. El sistema requiere detectar primero la parte del cuerpo (cabeza, manos, rostro) antes de poder validar el EPP correspondiente (casco, guantes, gafas). Esto ocurre cuando las personas están muy lejos, parcialmente visibles, dentro de vehículos o en ángulos difíciles. Aunque los EPP sean visibles, sin la detección de la parte del cuerpo asociada, no pueden evaluarse con precisión.

**📸 RECOMENDACIONES PARA MEJORAR LA DETECCIÓN:**
• Tome fotos a 3-5 metros de distancia de las personas
• Use ángulos frontales o de 45° máximo (evite tomas desde muy arriba o muy abajo)
• Capture a las personas de cuerpo completo en el encuadre
• Evite que vehículos, equipos u objetos obstruyan la vista de las personas
• Asegúrese de buena iluminación (evite contraluz y sombras fuertes)
• Verifique que la imagen no esté borrosa antes de analizarla

"""
        
        exclusion_note = f" ({filtered_persons} excluidas - ver explicación abajo)" if filtered_persons > 0 else ""
        
        # Crear prompt mejorado
        prompt = f"""Redacta un resumen ejecutivo de seguridad industrial en español basado en estándares OSHA e ISO 45001.

RESULTADOS DEL ANÁLISIS:
- Personas detectadas: {total_persons_detected}
- Personas evaluables: {total_persons}{filter_info}
- Cumplimiento total (personas con todos los EPP): {compliant} de {total_persons} ({person_compliance_percentage}%)
- EPP detectados: {detected_epp_types} de {total_epp_types} requeridos ({epp_compliance_percentage}%)
- EPP presentes (cumplen umbral {min_confidence}%): {detected_str}
- EPP detectados pero NO cumplen umbral {min_confidence}%: {below_threshold_str}
- EPP ausentes (no detectados): {missing_str}{non_evaluable_info}

REDACTA EL RESUMEN EN ESTE FORMATO:

**DETECCIÓN Y CUMPLIMIENTO**
Se detectaron {total_persons_detected} persona(s) en la imagen, de las cuales {total_persons} fueron incluidas en el análisis{exclusion_note}. El cumplimiento total es de {person_compliance_percentage}% ({compliant} de {total_persons} personas evaluables con todos los EPP requeridos). Se detectaron {detected_epp_types} de {total_epp_types} tipos de EPP requeridos presentes en la imagen. [Agrega 1-2 líneas evaluando si este nivel es aceptable según normas de seguridad. IMPORTANTE: El cumplimiento se mide por personas que tienen TODOS los EPP, no por tipos de EPP presentes]

{non_evaluable_section}**ANÁLISIS DE EQUIPOS Y RIESGOS**
Los EPP detectados (cumplen umbral {min_confidence}%) incluyen: {detected_str}. {('EPP detectados pero NO cumplen umbral: ' + below_threshold_str + '. Estos elementos fueron detectados pero con confianza inferior al {min_confidence}% requerido, por lo tanto NO cumplen con el estándar establecido. Se recomienda verificación visual y ajuste de ángulo de captura.') if below_threshold_epps else ''} Los EPP ausentes (no detectados) son: {missing_str}. [Agrega 2-3 líneas explicando los riesgos específicos de los EPP ausentes o felicitando si cumplimiento es 100%. Si hay EPPs que NO cumplen umbral, menciona que aunque fueron detectados, NO alcanzan el nivel de confianza requerido y deben considerarse como NO cumplientes]

**RECOMENDACIONES**

• **Acción Correctiva Inmediata**: [2-3 líneas sobre proveer EPP faltantes o mantener estándar. Incluye plazo: 24-48h si crítico, 7 días si preventivo]

• **Capacitación y Procedimientos**: [2-3 líneas sobre reforzar uso correcto de EPP y procedimientos. Sugiere frecuencia: mensual o trimestral]

• **Seguimiento e Inspección**: [2-3 líneas sobre programa de inspecciones. Sugiere próxima inspección: semanal si hay incumplimiento, mensual si cumple]

NO uses formato de documento oficial. NO incluyas campos vacíos como [Insertar]. Escribe el contenido completo.
"""

        # Llamar a Claude 3 Haiku
        response = bedrock.invoke_model(
            modelId='anthropic.claude-3-haiku-20240307-v1:0',
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1024,
                "temperature": 0.7,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            })
        )
        
        response_body = json.loads(response['body'].read())
        summary = response_body['content'][0]['text'].strip()
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({'summary': summary})
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }