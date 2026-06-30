# Instrucciones del proyecto para agentes

- Considerar Vercel y Supabase como el unico entorno activo del proyecto.
- No levantar, configurar ni validar flujos usando `server.py`, SQLite local o `data/gestor_qa.db`, salvo que el usuario lo pida explicitamente.
- Para cambios de backend, trabajar sobre las funciones serverless en `api/` y el esquema `supabase/schema.sql`.
- Para pruebas funcionales, usar la URL publicada en Vercel o previews de Vercel indicadas por el usuario.
- Mantener la documentacion y los scripts orientados a Supabase; cualquier referencia a SQLite debe tratarse como legado.
