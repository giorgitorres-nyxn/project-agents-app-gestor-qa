# Migracion a Supabase y Vercel

Esta rama prepara la migracion de Gestor QA desde `server.py` + SQLite local hacia una app publicada en Vercel con datos compartidos en Supabase.

## Objetivo

- Publicar el frontend en Vercel.
- Usar Supabase Postgres como base de datos compartida.
- Agregar autenticacion para colaboradores.
- Mantener la funcionalidad actual: tablero, CRUD, indicadores, filtros personalizados y exportacion.

## Estrategia recomendada

Para una primera migracion conservadora, mantener el modelo actual de datos en tablas Postgres con `payload jsonb`.

Ventajas:

- Reduce el cambio inicial en el frontend.
- Permite migrar la data actual casi 1:1 desde SQLite.
- Mantiene flexibilidad mientras se estabiliza el uso real con colaboradores.

Mas adelante se puede normalizar a columnas reales si se necesitan reportes SQL mas fuertes, relaciones estrictas o validaciones avanzadas.

## Archivos preparados

- `supabase/schema.sql`: crea tablas, indices, triggers `updated_at` y politicas RLS iniciales.
- `api/[...path].js`: API serverless para Vercel con el mismo contrato actual de la app (`/api/data`, `/api/export`, CRUD).
- `scripts/import-to-supabase.js`: importa un export JSON de Gestor QA hacia Supabase.
- `.env.example`: ejemplo de variables necesarias para local/scripts.

## Tablas esperadas

- `members`
- `useCases`
- `testCases`
- `bugs`
- `tasks`
- `spMigrations`

Cada tabla contiene:

- `id uuid primary key`
- `payload jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

## Variables necesarias

En local y Vercel:

```text
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Si luego agregamos login directo desde frontend, tambien se usara:

```text
SUPABASE_ANON_KEY=
```

La `SUPABASE_SERVICE_ROLE_KEY` solo debe vivir en entornos privados de servidor, como Vercel Serverless Functions o scripts locales. No debe exponerse en `app.js`, HTML ni commits.

## API en Vercel

La app sigue llamando las rutas existentes:

- `GET /api/data`
- `GET /api/export`
- `POST /api/:store`
- `PUT /api/:store/:id`
- `DELETE /api/:store/:id`

En local con `python server.py`, esas rutas siguen usando SQLite. En Vercel, esas rutas las atiende `api/[...path].js` contra Supabase.

## Pasos propuestos

1. Crear proyecto en Supabase.
2. Ejecutar `supabase/schema.sql` en el SQL Editor de Supabase.
3. Decidir autenticacion:
   - Magic link por correo.
   - Email/password.
   - Correos permitidos manualmente.
4. Exportar datos actuales desde `http://127.0.0.1:8000/api/export`.
5. Importar el JSON a Supabase:

   ```powershell
   $env:SUPABASE_URL="https://..."
   $env:SUPABASE_SERVICE_ROLE_KEY="..."
   npm.cmd run import:supabase -- .\ruta\gestor-qa-export.json
   ```

6. Configurar `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en Vercel.
7. Probar la preview de Vercel.
8. Agregar pantalla de login y control de sesion antes de abrir la app a mas personas.
9. Probar CRUD e indicadores con Playwright.
10. Hacer deploy desde la rama de migracion o abrir PR hacia `main`.

## Decisiones pendientes

- Si todos los colaboradores pueden editar todo o si habra roles.
- Si se permitiran adjuntos/evidencias en Supabase Storage.
- Si el despliegue inicial sera una preview de Vercel o produccion.
- Si se migra la base `data/gestor_qa.db`, un export JSON o un archivo externo de casos.
- Como se protegera el acceso antes de publicar la URL final.

## Nota de seguridad

Las politicas iniciales del schema permiten leer y editar a cualquier usuario autenticado. La API serverless usa `SUPABASE_SERVICE_ROLE_KEY`, por lo que antes de produccion conviene agregar autenticacion o una restriccion de acceso en Vercel/app para evitar que cualquier persona con la URL use la API.
