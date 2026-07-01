# Arquitectura modular tipo MVC

Este proyecto usa un patron inspirado en MVC, adaptado a una app HTML/JS desplegada en Vercel con API serverless y Supabase como base de datos.

No se usa `server.py`, SQLite local ni `data/gestor_qa.db` para desarrollo o validacion normal. El entorno activo es Vercel + Supabase, y las pruebas funcionales se realizan contra `https://project-agents-app-gestor-qa.vercel.app/`, salvo que el usuario indique una URL de preview de Vercel.

## Capas

### Domain / Model

Contiene reglas puras y configuracion compartida por frontend y backend.

- `src/domain/projectConfig.js`
  - Stores disponibles.
  - Definicion de catalogos.
  - Transiciones validas para migracion de SP.
  - Validador compartido de transiciones.

Esta capa no debe depender del DOM, de `fetch`, de Supabase ni de variables de entorno.

### View

Las vistas del frontend viven en `src/views/`.

- `src/views/appView.js`: alterna la vista activa y coordina el render de cada pantalla.
- `src/views/dashboardView.js`: tablero, metricas, Kanban y carga del equipo.
- `src/views/indicatorsView.js`: indicadores operativos y tarjetas de salud.
- `src/views/listView.js`: tablas, filtros, paginacion y controles inline.
- `src/views/configurationView.js`: paneles de catalogos y consola SQL de Supabase.
- `src/views/formView.js`: campos y opciones del dialogo de edicion.

Responsabilidades:

- Renderizar HTML a partir del estado actual.
- Mostrar estados vacios, errores visuales y controles de cada pantalla.
- Delegar acciones de usuario a controladores cuando la accion modifica estado o llama a la API.

Regla: las vistas no deben definir reglas de negocio compartidas. Si una regla tambien debe vivir en backend, debe moverse a `src/domain/`.

### Controller

Los controladores del frontend viven en `src/controllers/`.

- `src/controllers/appController.js`: navegacion principal, busqueda global y eventos globales.
- `src/controllers/authController.js`: login, logout y restauracion de sesion.
- `src/controllers/configurationController.js`: acciones de catalogos y consola SQL.
- `src/controllers/editorController.js`: apertura del dialogo, guardado y borrado.
- `src/controllers/importController.js`: carga masiva, normalizacion y remapeo de relaciones.

Responsabilidades:

- Coordinar eventos del usuario.
- Actualizar el estado en memoria.
- Llamar a servicios y API.
- Invocar renders.

`app.js` queda limitado al bootstrap del frontend: enlaza `DOMContentLoaded`, registra eventos globales e inicializa la sesion.

`api/[...path].js` funciona como controlador serverless:

- Resuelve rutas HTTP.
- Aplica autorizacion basica.
- Coordina repositorios y validadores.
- Mantiene el contrato existente de `/api/...`.

### Services / Repository

El cliente de API del frontend vive en `src/services/apiClient.js`:

- Encapsula `fetch`.
- Maneja errores HTTP y sesion expirada.
- Lee y persiste registros mediante las rutas `/api/...`.
- Refresca datos y catalogos desde el backend serverless.

La API serverless delega infraestructura a `api/_lib/`:

- `api/_lib/supabaseClient.js`: crea el cliente Supabase usando variables de entorno.
- `api/_lib/recordsRepository.js`: lectura, escritura, borrado y exportacion de registros.
- `api/_lib/auth.js`: cookie de sesion, login por miembro QA y usuario actual.
- `api/_lib/sqlConsole.js`: ejecucion controlada de la consola SQL.
- `api/_lib/http.js`: parseo de rutas, cookies y respuestas JSON.

## Reglas para cambios futuros

- Mantener `api/[...path].js` delgado. Si crece una responsabilidad, moverla a `api/_lib/`.
- Mantener reglas compartidas en `src/domain/`.
- No duplicar validaciones entre frontend y backend.
- No cambiar rutas API durante refactors internos.
- Ejecutar `npm.cmd test` despues de cada refactor.
- Validar funcionalmente en Vercel cuando el cambio ya este desplegado.

## Estado del refactor frontend

La separacion de `app.js` ya esta aplicada:

1. `app.js` es bootstrap.
2. Estado/configuracion de frontend vive en `src/frontend/appState.js`.
3. Cliente API vive en `src/services/apiClient.js`.
4. Vistas viven en `src/views/`.
5. Controladores viven en `src/controllers/`.
6. Helpers compartidos de UI viven en `src/shared/frontendHelpers.js`.

Para futuros cambios, agregar comportamiento nuevo en la capa correspondiente y evitar volver a crecer `app.js`.
