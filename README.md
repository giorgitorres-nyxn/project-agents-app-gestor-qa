# Gestor QA

Aplicacion local para gestionar procesos de QA con una interfaz tipo tablero.

## Arquitectura

- Backend en Python usando solo librerias estandar.
- Base de datos local SQLite en `data/gestor_qa.db`.
- Frontend en HTML, CSS y JavaScript.
- POO con capas simples:
  - `DatabaseManager`: crea conexiones y tablas.
  - `JsonRepository`: patron Repository para acceder a SQLite.
  - `QAService`: casos de uso y reglas de aplicacion.
  - `QARequestHandler`: controlador HTTP/API.
  - `AppFactory`: ensambla la aplicacion.

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

## Como ejecutar

Desde esta carpeta:

```powershell
python server.py
```

Si tu instalacion usa el lanzador de Windows:

```powershell
py server.py
```

Luego abre:

```text
http://127.0.0.1:8000
```

Para detener el servidor, presiona `Ctrl+C` en la terminal.
