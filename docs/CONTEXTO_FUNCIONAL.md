# Contexto funcional

La finalidad del aplicativo es apoyar al equipo QA durante la migracion de Stored Procedures a microservicios.

## Flujo actual

1. El equipo de migracion toma un Stored Procedure.
2. Por cada SP genera un archivo `.sql`.
3. QA usa el archivo `.sql` para generar casos de uso y casos de prueba.
4. El equipo de migracion genera un servicio REST y un servicio gRPC para cada SP.
5. QA genera una matriz de equivalencia entre el comportamiento del SP y los microservicios.
6. QA carga o referencia evidencias en QMetry.
7. El banco revisa la evidencia antes del cierre del SP.

## Reglas actuales

- Cada SP tiene un dev asignado.
- Cada SP tiene un QA asignado.
- El seguimiento debe permitir saber en que estado esta cada SP y que artefactos ya fueron entregados.

## Nota

Este contexto puede cambiar. Cada cambio funcional debe quedar registrado en `docs/CHANGELOG.md`.
