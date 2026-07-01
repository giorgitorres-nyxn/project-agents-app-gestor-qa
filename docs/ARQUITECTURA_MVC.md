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

La vista sigue concentrada principalmente en `app.js` mientras se completa la migracion gradual.

Responsabilidades actuales:

- Renderizar tablero, indicadores, listas, formularios y configuracion.
- Construir HTML y enlazar eventos de UI.
- Mostrar errores y estados de carga.

Regla: las vistas no deben definir reglas de negocio compartidas. Si una regla tambien debe vivir en backend, debe moverse a `src/domain/`.

### Controller

`app.js` funciona como controlador principal del frontend:

- Coordina eventos del usuario.
- Actualiza el estado en memoria.
- Llama a la API.
- Invoca renders.

`api/[...path].js` funciona como controlador serverless:

- Resuelve rutas HTTP.
- Aplica autorizacion basica.
- Coordina repositorios y validadores.
- Mantiene el contrato existente de `/api/...`.

### Services / Repository

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

## Secuencia recomendada para seguir ordenando

1. Extraer cliente API del frontend a `src/services/apiClient.js`.
2. Extraer importacion masiva a `src/services/importService.js`.
3. Separar renders por vista en `src/views/`.
4. Separar coordinadores de eventos en `src/controllers/`.
5. Dejar `app.js` solo como bootstrap del frontend.
