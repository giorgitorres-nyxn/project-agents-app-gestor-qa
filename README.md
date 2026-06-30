# Gestor QA

Aplicacion web en Vercel para gestionar procesos de QA con una interfaz tipo tablero y datos compartidos en Supabase.

## Entorno activo

El proyecto se trabaja exclusivamente sobre Vercel y Supabase.

- Frontend publicado en Vercel.
- API serverless en `api/`.
- Base de datos Supabase Postgres definida en `supabase/schema.sql`.
- No se debe levantar ni configurar `server.py`, SQLite local o `data/gestor_qa.db`, salvo solicitud explicita del usuario.
- Las pruebas funcionales deben hacerse contra la URL de Vercel o una preview de Vercel indicada por el usuario.

## Arquitectura

- Frontend en HTML, CSS y JavaScript.
- API serverless para Vercel en `api/[...path].js`.
- Base de datos Supabase Postgres con tablas JSONB.
- Esquema y politicas en `supabase/schema.sql`.

## Funcionalidades

- Tablero Kanban de tareas con arrastrar y soltar.
- CRUD de casos de prueba, casos de uso, errores detectados, miembros QA y tareas.
- Seguimiento de migracion de SP con:
  - Dev y QA asignados
  - Archivo `.sql`, REST endpoint, gRPC method
  - Rastreo de fechas de recepción para cada artefacto
  - Matriz de equivalencia y evidencia QMetry
  - **Validación de flujo de estado** (no permite saltar etapas)
  - **Métricas de progreso** en el dashboard (% completado, en progreso, listos)
- Asignacion de responsables y seguimiento de carga de trabajo.
- Busqueda global y filtros por estado.
- Exportacion de datos a JSON.

## Contexto funcional actual

El proyecto apoya la migracion de Stored Procedures a microservicios. El equipo de migracion entrega un archivo `.sql` por cada SP, y el equipo QA usa esa informacion para generar casos de uso y casos de prueba. Por cada SP tambien se generan endpoints REST y metodos gRPC que QA debe validar mediante matriz de equivalencia y evidencias en QMetry.

**Características de rastreo:**
- Se registran las fechas de recepción de cada artefacto (.sql, REST, gRPC)
- El flujo de estado está validado: no se puede saltar etapas ni retroceder
- El dashboard muestra métricas de progreso (% completados, en progreso, listos para QMetry)

Este contexto puede cambiar; cada cambio funcional debe documentarse en `docs/CHANGELOG.md`.

## Como validar

Validar cambios contra la app publicada en Vercel o contra una preview de Vercel. Para cambios de base de datos, aplicar primero las instrucciones de `supabase/schema.sql` en Supabase.
