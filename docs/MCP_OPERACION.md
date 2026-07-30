# Operacion con MCP

Este proyecto debe operarse contra Vercel, Supabase y GitHub. No usar SQLite ni `server.py` para validaciones normales. Todas las pruebas funcionales deben realizarse contra `https://project-agents-app-gestor-qa.vercel.app/`, salvo que el usuario indique explicitamente una URL de preview de Vercel.

## GitHub

El conector de GitHub puede usarse para:

- Revisar commits, PRs y estado de workflows.
- Consultar logs de GitHub Actions.
- Crear o modificar archivos cuando el flujo lo requiera.

## Supabase

Configurar un MCP de Supabase con permisos sobre el proyecto correcto. Usos esperados:

- Ejecutar el SQL de `supabase/schema.sql`.
- Verificar que existan tablas como `catalogs`.
- Consultar errores de RLS, triggers o indices.
- Revisar datos de tablas JSONB cuando sea necesario.

Variables recomendadas para el entorno del MCP:

```text
SUPABASE_PROJECT_REF=
SUPABASE_ACCESS_TOKEN=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Usar permisos minimos posibles. `SUPABASE_SERVICE_ROLE_KEY` es sensible y solo debe vivir en entornos privados.

## Vercel

Configurar un MCP de Vercel para:

- Revisar deployments y previews.
- Consultar logs de funciones serverless.
- Confirmar variables de entorno del proyecto.
- Validar errores como `FUNCTION_INVOCATION_FAILED`.

Variables recomendadas para el entorno del MCP:

```text
VERCEL_TOKEN=
VERCEL_TEAM_ID=
VERCEL_PROJECT_ID=
```

## Regla operativa

Antes de ejecutar cambios de alto impacto, como SQL destructivo o cambios de variables de entorno, el agente debe explicar que accion va a ejecutar y esperar confirmacion explicita del usuario.
