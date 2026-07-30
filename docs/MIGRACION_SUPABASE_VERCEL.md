# Supabase y Vercel

Gestor QA usa Vercel y Supabase como unico entorno activo. Las pruebas funcionales deben ejecutarse contra `https://project-agents-app-gestor-qa.vercel.app/`, salvo que el usuario indique explicitamente una URL de preview de Vercel. Las referencias a `server.py`, SQLite local o `data/gestor_qa.db` son legado y no deben usarse para nuevas validaciones, configuraciones o desarrollo, salvo solicitud explicita del usuario.

## Objetivo actual

- Mantener el frontend publicado en Vercel.
- Usar Supabase Postgres como base de datos compartida.
- Agregar autenticacion para colaboradores.
- Mantener la funcionalidad actual: tablero, CRUD, indicadores, filtros personalizados y exportacion.

## Estrategia recomendada

Para una primera migracion conservadora, mantener el modelo actual de datos en tablas Postgres con `payload jsonb`.

Ventajas:

- Reduce el cambio inicial en el frontend.
- Permite importar datos autorizados casi 1:1 desde JSON hacia Supabase.
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

En Vercel y scripts administrativos autorizados:

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

Estas rutas las atiende `api/[...path].js` contra Supabase. No usar `python server.py` ni SQLite local para validar estos flujos.

## Pasos propuestos

1. Crear proyecto en Supabase.
2. Ejecutar `supabase/schema.sql` en el SQL Editor de Supabase.
3. Decidir autenticacion:
   - Magic link por correo.
   - Email/password.
   - Correos permitidos manualmente.
4. Importar JSON autorizado a Supabase cuando sea necesario:

   ```powershell
   $env:SUPABASE_URL="https://..."
   $env:SUPABASE_SERVICE_ROLE_KEY="..."
   npm.cmd run import:supabase -- .\ruta\gestor-qa-export.json
   ```

5. Configurar `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en Vercel.
6. Probar el despliegue en `https://project-agents-app-gestor-qa.vercel.app/`, o una preview de Vercel solo si fue indicada por el usuario.
7. Probar CRUD e indicadores con Playwright contra ese ambiente de Vercel.
8. Hacer deploy desde la rama de trabajo o abrir PR hacia `main`.

## Decisiones pendientes

- Si todos los colaboradores pueden editar todo o si habra roles.
- Si se permitiran adjuntos/evidencias en Supabase Storage.
- Si se migra la base `data/gestor_qa.db`, un export JSON o un archivo externo de casos.
- Como se protegera el acceso al ambiente publicado.

## Nota de seguridad

Las politicas iniciales del schema permiten leer y editar a cualquier usuario autenticado. La API serverless usa `SUPABASE_SERVICE_ROLE_KEY`, por lo que antes de produccion conviene agregar autenticacion o una restriccion de acceso en Vercel/app para evitar que cualquier persona con la URL use la API.
