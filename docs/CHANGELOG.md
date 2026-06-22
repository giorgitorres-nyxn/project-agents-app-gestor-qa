# Changelog

## 2026-06-22

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

**Cambios en archivos:**
- `app.js`: 
  - Agregado `spMigrationTransitions` object y `validateSPStatusTransition()` function
  - `saveRecord()` ahora valida transiciones de SP antes de guardar
  - `handleFormSubmit()` captura y muestra errores de validación al usuario
  - `renderMetrics()` ahora calcula y muestra 3 métricas adicionales de SP
  - `fieldConfig.spMigrations` agregados 3 campos de fecha
- `server.py`:
  - `QAService` agregado atributo `SP_VALID_TRANSITIONS` con el flujo válido
  - `QAService.update()` valida transiciones de SP antes de guardar
  - Agregado método `_validate_sp_transition()` para aplicar reglas
  - Datos de seed actualizados con fechas completas en los 2 SPs de ejemplo
- `docs/CHANGELOG.md`: Este archivo actualizado (versión mejorada)

**Cómo probar:**
1. **Métricas**: Abre dashboard, verifica 3 nuevas métricas de SP
2. **Fechas**: Ve a "Migracion SP", edita un SP, ves 3 campos de fecha nuevos
3. **Validación**: Intenta cambiar estado inválido (ej: SQL recibido → En QA), verifica error
4. **Flujo válido**: Sigue el path correcto, verifica que no hay errores

---

## 2026-06-22 (Inicial)

- Se agrego la entidad `spMigrations` para rastrear la migracion de Stored Procedures a microservicios.
- Se creo una nueva pestaña de menu llamada `Migracion SP`, ubicada debajo de `Tareas`.
- La nueva vista permite registrar:
  - Nombre del SP.
  - Archivo `.sql` entregado por migracion.
  - Dev asignado.
  - QA asignado.
  - Estado del seguimiento.
  - Endpoint REST generado.
  - Metodo gRPC generado.
  - Matriz de equivalencia.
  - Evidencia QMetry.
  - Notas QA.
- Se actualizo el backend Python para crear la tabla SQLite correspondiente y exponerla en la API generica.
- Se actualizo el tablero con una metrica de SP en migracion.

