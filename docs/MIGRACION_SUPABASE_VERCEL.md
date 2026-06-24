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
SUPABASE_ANON_KEY=
```

Solo para scripts de migracion local, nunca para frontend ni Vercel publico:

```text
SUPABASE_SERVICE_ROLE_KEY=
```

## Pasos propuestos

1. Crear proyecto en Supabase.
2. Ejecutar `supabase/schema.sql` en el SQL Editor de Supabase.
3. Decidir autenticacion:
   - Magic link por correo.
   - Email/password.
   - Correos permitidos manualmente.
4. Crear script de exportacion desde SQLite a JSON si no se usa `/api/export`.
5. Crear script de importacion JSON -> Supabase.
6. Reemplazar las llamadas actuales `/api/...` por un cliente de datos compatible con Supabase.
7. Agregar pantalla de login y control de sesion.
8. Configurar variables de entorno en Vercel.
9. Probar CRUD e indicadores con Playwright.
10. Hacer deploy desde la rama de migracion o abrir PR hacia `main`.

## Decisiones pendientes

- Si todos los colaboradores pueden editar todo o si habra roles.
- Si se permitiran adjuntos/evidencias en Supabase Storage.
- Si el despliegue inicial sera una preview de Vercel o produccion.
- Si se migra la base `data/gestor_qa.db`, un export JSON o un archivo externo de casos.

## Nota de seguridad

Las politicas iniciales del schema permiten leer y editar a cualquier usuario autenticado. Antes de produccion conviene restringir por lista de correos o tabla de perfiles.
