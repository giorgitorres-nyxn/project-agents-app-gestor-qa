# Changelog

## 2026-06-22

### Versión 1.2.0 - Checkboxes para Seguimiento de Artefactos

#### Cambio: Interfaz Visual Simplificada
Se reemplazaron los campos de texto para artefactos por checkboxes que el QA marca a medida que completa cada etapa:

**Campos modificados:**
- `sqlFile` (texto) → `sqlReceived` (checkbox) ✓
- `restEndpoint` (texto) → `restReceived` (checkbox) ✓
- `grpcMethod` (texto) → `grpcReceived` (checkbox) ✓
- `equivalenceMatrix` (textarea) → `equivalenceMatrixReady` (checkbox) ✓
- `qmetryEvidence` (textarea) → `qmetryEvidenceReady` (checkbox) ✓

**Campos mantenidos:**
- `sqlReceivedDate`, `restReceivedDate`, `grpcReceivedDate` - Rastrean cuándo se recibió cada artefacto
- `notes` - Notas QA de propósito general

**Por qué:** Visual más clara (✓ o ◯), acciones más rápidas, menos escritura. Las fechas aún registran cuándo completó cada etapa para auditoría.

**Cómo se ve:**
- En el formulario: Checkboxes con etiquetas claras
- En la tabla: Checkmarks (✓) o círculos vacíos (◯) en columnas SQL, REST, gRPC, Matriz, QMetry
- Tooltips muestran la fecha cuando pasas el cursor

**Cambios técnicos:**
- `app.js`: Agregado soporte para `type: "checkbox"` en renderForm()
- `app.js`: Conversión correcta de booleanos en handleFormSubmit()
- `app.js`: Tabla muestra checkmarks en lugar de texto
- `server.py`: Datos de seed actualizados con valores booleanos
- Commit: `6e368e6`

---

### Versión 1.1.0 - Mejoras en Rastreo de Migraciones de SP

#### 1. Métricas de Progreso Mejoradas
- Agregadas 3 nuevas métricas en el tablero dashboard para visualizar progreso de SP:
  - **SP en migración**: Total de SPs con % completados
  - **SP en progreso**: Conteo activo y cuántos esperan entrada (SQL/REST/gRPC)
  - **SP listos QMetry**: Conteo de SPs listos para matriz y evidencia
- Razón: El equipo necesita visibilidad rápida del progress general sin entrar a la pestaña

#### 2. Rastreo de Fechas de Entrega
- Agregados 3 nuevos campos de fecha a cada SP:
  - **Fecha recepción SQL**: Cuándo se entregó el `.sql`
  - **Fecha recepción REST**: Cuándo se generó el endpoint REST
  - **Fecha recepción gRPC**: Cuándo se generó el método gRPC
- Razón: QA necesita rastrear línea de tiempo de entregas y detectar cuellos de botella
- Formato: ISO 8601 (YYYY-MM-DD), mismo que `dueDate` en tareas
- Los datos de seed incluyen fechas de ejemplo para desarrollo

#### 3. Validación de Transiciones de Estado
- Implementado flujo de estado estricto para SPs (no permite saltar etapas ni retroceder):
  - SQL recibido → REST/gRPC recibido → En QA → Matriz lista → Evidencia QMetry → Finalizado
  - Permitido: Cualquier estado → Finalizado (cierre de emergencia)
  - No permitido: Saltos (ej: SQL recibido → En QA)
  - No permitido: Retrocesos (ej: En QA → REST/gRPC recibido)
  - Terminales: Finalizado no se puede cambiar
- Razón: Asegurar proceso consistente y evitar datos incoherentes
- Validación ocurre client-side (inmediato) y server-side (seguridad)
- Si la transición es inválida, aparece error y el SP no se actualiza

#### 4. Null Safety Defensivo
- Agregados optional chaining (?.) y nullish coalescing (??) en todo el código
- Previene errores "Cannot read properties of undefined"
- Aplicado a: renderMetrics(), renderList(), renderKanban(), optionsFor(), saveRecord(), findName()

---

## 2026-06-22 (Inicial)

- Se agrego la entidad `spMigrations` para rastrear la migracion de Stored Procedures a microservicios.
- Se creo una nueva pestaña de menu llamada `Migracion SP`, ubicada debajo de `Tareas`.
- La nueva vista permite registrar información sobre cada SP.
- Se actualizo el backend Python para crear la tabla SQLite correspondiente y exponerla en la API generica.
- Se actualizo el tablero con una metrica de SP en migracion.


