# Instrucciones del proyecto para agentes

- Considerar Vercel y Supabase como el unico entorno activo del proyecto.
- No levantar, configurar ni validar flujos usando `server.py`, SQLite local o `data/gestor_qa.db`, salvo que el usuario lo pida explicitamente.
- Para cambios de backend, trabajar sobre las funciones serverless en `api/` y el esquema `supabase/schema.sql`.
- Para pruebas funcionales, usar `https://project-agents-app-gestor-qa.vercel.app/`.
- Usar previews de Vercel solo si el usuario indica explicitamente una URL de preview.
- Mantener la documentacion y los scripts orientados a Supabase; cualquier referencia a SQLite debe tratarse como legado.
- Si estan disponibles, usar MCP/conectores de GitHub, Supabase y Vercel para revisar commits, ejecutar migraciones, inspeccionar logs y validar deployments.
- No imprimir ni guardar tokens; usar siempre variables de entorno o credenciales gestionadas por el conector/MCP.
