# Changelog

## 2026-08-24

### Cambio: Totales de alcance en Indicadores

- Se agrega una tarjeta `Alcance filtrado` con totales unicos de Lotes, Funcionalidades y Microservicios.
- La tarjeta respeta el filtro superior de Indicadores, por ejemplo muestra cuantos microservicios quedan dentro de un lote o una funcionalidad.
- Se agrega la tarjeta `Total errores`, tambien acotada por lote, funcionalidad o microservicio, para consultar errores totales del alcance seleccionado.

---

### Cambio: Filtros ampliados en Lotes y funcionalidades

- La vista `Lotes y funcionalidades` ahora incluye la barra de filtros por rango de fechas, lote, funcionalidad y microservicio.
- El constructor de filtros de la misma vista agrega los campos Lote, Funcionalidad, Microservicio y Caso de prueba.
- El filtro por Caso de prueba relaciona los casos con el microservicio del lote, conservando compatibilidad con registros legados asociados por SP.

---

## 2026-08-18

### Corregir: Quitar la validacion obligatoria de secuencia de Estado en Lotes y funcionalidades

- Al cambiar el Estado de un registro de Lotes y funcionalidades, el sistema exigia una secuencia fija (SQL recibido -> REST/gRPC recibido -> En QA -> Matriz lista -> Evidencia QMetry -> En revision por banco -> Finalizado) y bloqueaba con un error cualquier salto o retroceso fuera de ese orden.
- Esa secuencia dependia de los campos de SQL/REST/gRPC recibido que ya se habian eliminado del formulario; la validacion quedo exigiendo un orden sin ningun campo que lo respalde.
- Se quita esa validacion por completo: el Estado ahora se puede cambiar libremente a cualquier valor del catalogo, sin restriccion de orden. Se corrigio en los 3 lugares donde estaba duplicada: el formulario (frontend), el backend de Vercel/Supabase y el servidor local de desarrollo.

---

### Cambio: Eliminar todo lo referente a Casos de Uso (CU) de la interfaz

- Se quita el menu, la vista y el formulario de "Casos de uso".
- Casos de prueba pierde el selector y el filtro de "Caso de uso" (el campo `useCaseId`).
- Indicadores pierde la grafica "Casos de uso por estado".
- Configuracion pierde la seccion de catalogos "Casos de uso".
- Carga masiva deja de aceptar el grupo `useCases` y el campo `useCaseId` en Casos de prueba (boton, ejemplo y mensaje de ayuda actualizados).
- La derivacion de microservicio heredado para Casos de prueba viejos ya no pasa por Caso de uso: los pocos registros que solo tenian esa cadena (sin SP ni Microservicio propio) mostraran "Sin microservicio" hasta que se editen a mano. La cadena Error -> Caso de prueba -> SP no se toca.
- Cambio solo de interfaz: la tabla `useCases` en Supabase, la ruta del API y `projectConfig.js` quedan intactos.

---

### Cambio: Renombrar "Lotes y Microservicios" a "Lotes y funcionalidades" y quitar seguimiento de SQL/REST/gRPC

- El menu y la pestana pasan de "Lotes y Microservicios" a "Lotes y funcionalidades".
- Se eliminan del formulario y de la tabla los 6 campos de seguimiento de artefactos por SP: Fecha recepcion SQL, SQL recibido, Fecha recepcion REST, REST endpoint recibido, Fecha recepcion gRPC y gRPC method recibido.
- En Indicadores se elimina la tarjeta "REST/gRPC listos"; el desglose "Artefactos SP" y la grafica "Artefactos por SP" quedan solo con Matriz de equivalencia lista y Evidencia QMetry.
- El ejemplo de carga masiva de este store ya no incluye esos 6 campos.

---

### Cambio: Tareas, Casos de prueba y Errores se asignan a Microservicio en vez de SP

- Al crear o editar una tarea, un caso de prueba o un error, el campo "SP asignado" se reemplaza por "Microservicio": una lista de los microservicios existentes en Lotes y Microservicios, con opcion "Ninguno".
- Los registros existentes que ya tenian un SP asignado no se modifican en Supabase: el microservicio se deriva automaticamente del SP legado (o, en el caso de casos de prueba/errores, del caso de uso o caso de prueba relacionado) y se precarga al editar. Al guardar, el registro queda con el campo Microservicio directamente.
- En Errores, el selector de "Caso de prueba" ahora se acota por el Microservicio elegido (antes se acotaba por SP).
- En las tablas de Tareas, Casos de prueba y Errores, la columna y el filtro de texto libre que mostraban el SP ahora muestran el Microservicio ("Sin microservicio" si no tiene).
- Casos de uso no cambia: sigue asociado a un SP real.

---

### Cambio: Filtros por Lote/Funcionalidad/Microservicio y rango de fechas en Tareas, Casos de prueba y Errores

- Las 3 pestanas agregan una barra de filtros (Desde/Hasta + Lote/Funcionalidad/Microservicio en cascada), con la misma regla que el resto de la app: elegir Lote, Funcionalidad o Microservicio limpia el rango de fechas.
- El rango de fechas filtra por la fecha de creacion del registro (unico dato de fecha disponible en las 3 pestanas).
- En Tareas, este filtro nuevo se agrega junto al check existente de "Solo vencidas", sin reemplazarlo.

---

### Cambio: "Salud SP" y "Tareas vencidas por SP" ahora agrupan por Microservicio en Indicadores

- Como las tareas, casos de prueba y errores ya no se asocian a una fila exacta de SP sino a un Microservicio, las secciones "Salud SP" y "Tareas vencidas por SP" pasan a agrupar y mostrarse por Microservicio ("Salud por Microservicio" y "Tareas vencidas por Microservicio"), evitando duplicar o repartir datos cuando un microservicio agrupa varias filas de SP.
- El filtro global de Lote/Funcionalidad/Microservicio de Indicadores tambien pasa a acotar tareas/casos de prueba/errores por Microservicio.
- La carga masiva (JSON) de casos de prueba y errores usa ahora el campo "microservicio" en vez de "spMigrationId" en sus ejemplos.

---

## 2026-08-13

### Cambio: Rediseno de las tarjetas de tareas en Flujo de trabajo

- Las tarjetas del Kanban ahora muestran: titulo, prioridad, la ruta Lote › Funcionalidad › Microservicio del SP asociado, responsable (con iniciales), tipo de tarea, fecha de creacion y fecha de vencimiento.
- Nuevo diseno: encabezado con titulo/prioridad, la ruta del lote como una linea con separador, y un pie de dos filas (responsable + tipo, luego las dos fechas).
- Las fechas se muestran en formato "01 jul 2026" en la tarjeta (nuevo helper `formatCardDate`).
- Se quito el nombre de SP suelto que se mostraba antes (ya queda representado por la ruta Lote/Funcionalidad/Microservicio).

---

### Cambio: Corregir anillo en blanco en "Tareas vencidas por SP"

- El circulo de porcentaje de cada SP en "Riesgo por fechas" se veia casi en blanco cuando el porcentaje de vencidas era bajo o 0% (el relleno parcial no dibujaba nada visible).
- Ahora es un anillo completo (borde de color solido segun el semaforo), siempre visible sin importar el porcentaje: verde, amarillo o rojo segun la misma regla de siempre.

---

### Cambio: Filtros propios en la seccion "Riesgo por fechas" de Indicadores

- La seccion "Tareas vencidas por SP" (Riesgo por fechas) ahora tiene su propia barra de filtros, independiente del filtro global de Indicadores: rango de fechas (Desde/Hasta, sin valor por defecto) y Lote/Funcionalidad/Microservicio en cascada.
- Regla: al elegir Lote, Funcionalidad o Microservicio, el rango de fechas se limpia para mostrar todas las tareas sin importar la fecha; se puede volver a acotar despues.
- El rango de fechas ahora tambien limita que tareas cuentan para el porcentaje de vencidas de cada SP (antes siempre consideraba todas).

---

### Cambio: Filtro en cascada Lote/Funcionalidad/Microservicio en Indicadores

- El filtro de "SP" del menu de Indicadores se reemplaza por 3 filtros en cascada: Lote, Funcionalidad y Microservicio, cada uno con su opcion de "Todos/Todas".
- Elegir un Lote acota las opciones de Funcionalidad a las de ese lote; elegir una Funcionalidad acota Microservicio a las de esa funcionalidad.
- Todas las metricas, graficas e indicadores por SP se recalculan segun el alcance elegido (o sobre todos los datos si no hay filtro).
- Reutiliza `loteOptions`/`funcionalidadOptions`/`microservicioOptions` ya creadas para el filtro de Flujo de trabajo.

---

## 2026-08-12

### Cambio: Filtros de fecha en rango y Lote/Funcionalidad/Microservicio en Flujo de trabajo

- El filtro de fecha del Kanban pasa de una fecha exacta a un rango (Desde/Hasta), y por defecto arranca en la semana laboral actual (lunes a domingo que contiene hoy).
- Se agregan 3 filtros nuevos en cascada: Lote, Funcionalidad y Microservicio (Funcionalidad se acota al Lote elegido, Microservicio se acota a ambos).
- Regla: al elegir Lote, Funcionalidad o Microservicio, el rango de fechas se limpia automaticamente para mostrar todas las tareas sin importar la fecha; el usuario puede volver a acotar por fecha despues.
- Lote/Funcionalidad/Microservicio de una tarea se derivan del SP (microservicio) al que esta asociada, sin agregar campos nuevos a la tarea.

---

### Cambio: Renombrar Migracion SP a Lotes y Microservicios

- El menu y la pestana "Migracion SP" pasan a llamarse "Lotes y Microservicios".
- Se agregan 4 campos al crear/editar un registro: Numero de Lote, Funcionalidad, Nombre del Microservicio y Nombre del SP (este ultimo ya existia). Tambien se agregan como columnas nuevas en la tabla.
- La jerarquia Lote > Funcionalidad > Microservicio > SP no requiere tablas nuevas: surge de que varios registros pueden compartir el mismo Lote, la misma Funcionalidad o el mismo Microservicio (ej. un microservicio puede agrupar varios SP).
- El dialogo de crear/editar ahora dice "microservicio" en vez de "seguimiento de SP".

---

### Cambio: Tarjetas vencidas mas visibles en el Kanban

- La tarjeta de una tarea vencida ahora se pinta completa con fondo rojo tenue y borde rojo (antes solo tenia un borde izquierdo delgado, poco visible).
- Se corrige que el borde rojo no se perdiera al pasar el mouse sobre la tarjeta (`.card:hover` competia con `.card.overdue`).

---

## 2026-08-09

### Cambio: Ordenar columnas en Tareas, Casos de prueba, Migracion SP y Errores

- En esas 4 tablas, se puede hacer clic en el encabezado de cualquier columna para ordenar ascendente/descendente (una flecha indica la columna y direccion activa).
- El filtrado por cualquier campo ya existia (constructor de filtros de `listView.js`); este cambio agrega la parte de ordenar que faltaba.
- Reutiliza `filterValueFor` (ya existente) como valor de ordenamiento, para que columnas con nombre de SP/responsable o etiquetas de catalogo se ordenen por el texto visible, no por el id o valor interno.
- Casos de uso y Miembros QA quedan sin cambios (no se pidio para esas tablas).

---

## 2026-08-06

### Cambio: Semaforo de tareas vencidas por SP en Indicadores

- Nueva seccion de ancho completo en el menu de Indicadores: un anillo de porcentaje por cada SP, mostrando que proporcion de sus tareas esta vencida (fecha limite pasada y estado Pendiente o En progreso).
- Colores: Verde 10% o menos vencidas, Amarillo entre 11% y 50%, Rojo mas de 50%. Se incluye una leyenda con el significado de cada color.
- Respeta el filtro de SP existente en Indicadores (muestra solo el SP elegido, o todos si no hay filtro).
- Nuevas funciones `spOverdueItem`/`spOverdueSemaphore`/`spOverdueRing` en `src/views/indicatorsView.js`; reutiliza `taskIsOverdue` y `metricTone` ya existentes.

---

### Cambio: Total de tareas por SP en Indicadores

- Nueva tarjeta "Total de tareas" en el menu de Indicadores: cuenta todas las tareas del SP seleccionado en el filtro (sin importar su estado), o de todos los SP si no hay ninguno seleccionado.
- Reutiliza el filtro de SP y el arreglo de tareas ya filtrado que existian en `src/views/indicatorsView.js`; no se agrego logica de filtrado nueva.

---

### Cambio: Reporte de tareas vencidas

- Una tarea se marca como "vencida" cuando su fecha limite ya paso y su estado sigue en "Pendiente" o "En progreso" (una tarea en "En revision" o "Finalizado" nunca cuenta como vencida).
- Pestana Tareas: las tareas vencidas se resaltan en la tabla (fila y flag junto a la fecha) y hay un nuevo control "Solo vencidas (N)" para filtrarlas.
- Tablero Kanban (Flujo de trabajo): las tarjetas vencidas muestran el mismo flag y un borde distintivo.
- Dashboard: nueva tarjeta de metrica "Tareas vencidas".
- Regla compartida `isTaskOverdue` agregada a `src/domain/projectConfig.js`; helper `taskIsOverdue` en `src/shared/frontendHelpers.js`.

---

## 2026-07-30

### Cambio: Comentario obligatorio, iteraciones y mejoras a Flujo de trabajo

- Pestana `Tareas`: al cambiar el estado de una tarea (desde el formulario de edicion o arrastrando una tarjeta en el tablero Kanban), ahora es obligatorio registrar un comentario explicando el motivo del cambio. El comentario se acumula como historial por tarea (`statusHistory`, visible en el formulario de edicion).
- Nuevo campo `iterations` en tareas: se incrementa automaticamente en 1 cada vez que una tarea retrocede de "En revision" o "Finalizado" hacia "En progreso" o "Pendiente". Se muestra en la pestana Tareas (columna Iteraciones) y en el formulario de edicion.
- Regla compartida `isTaskIterationTransition` agregada a `src/domain/projectConfig.js`.
- Tablero "Flujo de trabajo" (Kanban del Dashboard): ahora tiene su propia barra de filtros (independiente de los filtros de la pestana Tareas) y un boton "Expandir" que abre el tablero en un overlay de pantalla completa dentro de la misma app, con los mismos filtros y tarjetas.
- Arrastrar una tarjeta a otra columna del Kanban ahora abre el formulario de edicion con el estado destino preseleccionado, para exigir el comentario obligatorio antes de confirmar el movimiento.

---

## 2026-07-02

### Cambio: Indicadores alineados a campos actuales

- La pestana `Indicadores` ahora calcula sus metricas usando los catalogos y campos vigentes de tareas, SP, casos de prueba, errores y miembros QA.
- Se agregaron desgloses para prioridad de casos, severidad de errores y artefactos de SP: SQL, REST, gRPC, matriz y QMetry.
- La salud por SP y el riesgo por miembro reutilizan los valores actuales de estado, ejecucion, aprobacion banco y severidad.

---

## 2026-07-01

### Cambio: Separacion frontend MVC

- Se redujo `app.js` a bootstrap del frontend.
- Se movio estado/configuracion de frontend a `src/frontend/appState.js`.
- Se movio el cliente de API a `src/services/apiClient.js`.
- Se separaron vistas en `src/views/` y controladores en `src/controllers/`.
- Se agrego `src/shared/frontendHelpers.js` para helpers compartidos de UI.
- Se actualizo `npm run check` para validar automaticamente todos los archivos JavaScript del proyecto.

---

### Cambio: Arquitectura modular tipo MVC

- Se agrego `docs/ARQUITECTURA_MVC.md` con las capas Domain/View/Controller/Services y reglas para futuros refactors.
- Se creo `src/domain/projectConfig.js` como fuente compartida para stores, catalogos y transiciones de SP.
- Se separo infraestructura serverless en `api/_lib/` para cliente Supabase, auth, repositorio, SQL console y helpers HTTP.
- Se adelgazo `api/[...path].js` para que opere como controlador/router serverless.
- Se actualizo `index.html` para cargar el dominio compartido antes de `app.js` y mostrar Vercel + Supabase como entorno activo.
- Se amplio `npm run check` para validar los modulos nuevos.

---

### Cambio: Ambiente oficial de pruebas

- Se documento que el proyecto usara solo Vercel y Supabase como entorno activo.
- Se fijo `https://project-agents-app-gestor-qa.vercel.app/` como ambiente obligatorio para pruebas funcionales.
- Se dejo el uso de previews de Vercel solo como excepcion cuando el usuario indique una URL especifica.

---

## 2026-06-30

### Cambio: Entorno unico Vercel/Supabase

- Se documento que el proyecto debe trabajarse exclusivamente contra Vercel y Supabase.
- Se agrego `AGENTS.md` para indicar a futuras sesiones que no usen `server.py`, SQLite local ni `data/gestor_qa.db`.
- Se actualizo el README y la documentacion de Supabase/Vercel para tratar SQLite como legado.

---

### Cambio: Configuracion de listas editables

- Se agrego la pestana `Configuracion` con submenus para Tareas, Migracion SPs, Casos de pruebas, Casos de uso, Errores y Miembros QA.
- Cada submenu permite administrar los valores de sus campos tipo lista, como `Rol` y `Estado` en Miembros QA.
- Los catalogos se guardan en Supabase mediante el nuevo store `catalogs`, para compartir la configuracion entre usuarios.
- Los formularios, tablas, filtros e indicadores usan los valores configurados.

---

### Cambio: Consola SQL de Supabase

- Se agrego el submenu `Consola Supabase` dentro de Configuracion.
- La consola ejecuta consultas mediante la API serverless y muestra resultados tabulares para `SELECT` o sentencias con `RETURNING`.
- El endpoint queda restringido a roles administrativos (`QA Lead`, `Admin` o `DBA`) y usa la funcion `public.run_sql_console` definida en `supabase/schema.sql`.

---

## 2026-06-25

### Cambio: Importacion robusta, paginacion y ejecucion de casos

- La importacion masiva ahora acepta IDs legibles y los convierte automaticamente a UUID para Supabase.
- Las relaciones del JSON (`spMigrationId`, `useCaseId`, `testCaseId`) se remapean durante la carga usando esos IDs legibles.
- Se agrega paginacion a las tablas con selector de filas por pagina.
- La tabla de casos de prueba incorpora `Ejecucion` y `Aprobado Banco`.
- En casos de prueba, `Estado`, `Ejecucion` y `Aprobado Banco` se pueden modificar directamente desde la tabla.

---

### Cambio: Archivo masivo de debcred compatible con Supabase

- Se ajusto `docs/gestor-qa-sp_debcred_empresa.json` para usar UUIDs en `spMigrations`, casos de uso y casos de prueba.
- Se conservaron las relaciones internas actualizando `spMigrationId` y `useCaseId` a los nuevos IDs UUID.
- El archivo queda listo para importacion en Vercel/Supabase sin errores por formato de ID.

---

### Cambio: Login simple por miembro QA

- Se agrego una pantalla de inicio de sesion antes de cargar el aplicativo.
- Cada miembro QA puede ingresar usando su correo como usuario.
- La contrasena por defecto para todos los miembros es `BbQAGestor`.
- Todos los usuarios autenticados tienen acceso completo al aplicativo.
- Las APIs locales y serverless ahora requieren sesion, salvo login/logout/verificacion de sesion.

---

### Cambio: Importacion masiva con SP por nombre o ID

- La carga masiva ahora acepta `spMigrationId` como ID interno o como nombre del SP.
- Si el JSON trae el nombre del SP, la app lo resuelve al ID real antes de guardar.
- En Vercel, los `PUT` usados durante importacion ahora hacen upsert para permitir IDs propios en CU y TC.

---

### Cambio: Carga masiva JSON para CU, TC y errores

- Se agrego un boton de `Carga masiva` en las vistas de Casos de uso, Casos de prueba y Errores.
- La carga acepta un arreglo directo para la vista actual o un objeto JSON con `useCases`, `testCases` y `bugs`.
- Cuando el JSON trae las tres listas, se importan en orden: casos de uso, casos de prueba y errores.
- Se agrego `docs/IMPORTACION_MASIVA_EJEMPLO.json` como estructura base para preparar archivos de importacion.

---

## 2026-06-24

### Cambio: API Vercel preparada para Supabase

- Se agrego una funcion serverless `api/[...path].js` que conserva las rutas actuales `/api/...` usando Supabase.
- Se agrego `scripts/import-to-supabase.js` para importar un export JSON hacia las tablas de Supabase.
- Se agrego `.env.example` y se protegieron `.env` locales en `.gitignore`.
- Se agrego `@supabase/supabase-js` y scripts npm para validar e importar datos.
- La app local con `server.py` sigue funcionando con SQLite; en Vercel, la API usara Supabase mediante variables de entorno.

---

### Cambio: Preparacion de migracion Supabase/Vercel

- Se creo la rama `Migracion` para aislar los cambios de despliegue y base de datos.
- Se agrego `supabase/schema.sql` con tablas Postgres basadas en `payload jsonb`, indices, triggers y RLS inicial.
- Se agrego `docs/MIGRACION_SUPABASE_VERCEL.md` con estrategia, variables, pasos y decisiones pendientes.
- La aplicacion aun no cambia su comportamiento; sigue usando SQLite en esta etapa.

---

### Cambio: Filtros personalizados en tablas

- Se quitaron los filtros por defecto de las tablas, como estados fijos y filtros automaticos por SP.
- Se agrego un constructor de filtros por tabla con campo, condicion y valor.
- Los filtros agregados aparecen como chips removibles y se pueden limpiar todos desde la misma tabla.
- Los campos relacionales se filtran con valores legibles, por ejemplo responsable, SP, caso de prueba y QA asignado.

---

### Cambio: Nueva pestaña de indicadores

- Se retiro del tablero la tarjeta lateral `Equipo / En que estan trabajando`.
- Se agrego la pestaña `Indicadores` para consultar KPIs globales, indicadores por miembro y graficas de distribucion.
- La nueva vista muestra ejecucion de casos, avance de SP, carga promedio, errores activos, QMetry listo y bloqueos.
- Tambien incluye comparativas por miembro, tareas por estado, SP por estado, errores activos por severidad y carga por miembro.

---

### Cambio: SP asociado en errores

- Se agrego el campo `SP asociado` al crear o editar errores.
- El campo `Caso de prueba` ahora se filtra para mostrar solo casos asociados al SP seleccionado.
- La tabla de errores ahora muestra el SP asociado junto al caso de prueba.
- Los errores existentes sin `spMigrationId` infieren el SP desde su caso de prueba asociado cuando es posible.

---

### Cambio: Estado de revision por banco

- Se agrego el estado `En revision por banco` al seguimiento de migraciones de SP.
- El estado aparece en filtros, formulario y etiquetas visuales de la vista `Migracion SP`.
- El flujo validado queda: SQL recibido -> REST/gRPC recibido -> En QA -> Matriz lista -> Evidencia QMetry -> En revision por banco -> Finalizado.
- Tambien se permite pasar directamente de `En QA` o `Matriz lista` a `En revision por banco` cuando el proceso del banco no requiere registrar primero la evidencia QMetry en la app.
- Se conserva el cierre directo a `Finalizado` desde estados previos como cierre de emergencia.

---

## 2026-06-22

### Versión 1.2.0 - Checkboxes para Seguimiento de Artefactos

#### Cambio: Interfaz Visual Simplificada
Se reemplazaron los campos de texto para artefactos por checkboxes que el QA marca a medida que completa cada etapa:

**Campos modificados:**
- `sqlFile` (texto) → `sqlReceived` (checkbox) ✓
- `restEndpoint` (texto) → `restReceived` (checkbox) ✓
- `grpcMethod` (texto) → `grpcReceived` (checkbox) ✓
- `equivalenceMatrix` (textarea) → `equivalenceMatrixReady` (checkbox) ✓
- `qmetryEvidence` (textarea) → `qmetryEvidenceReady` (checkbox) ✓

**Campos mantenidos:**
- `sqlReceivedDate`, `restReceivedDate`, `grpcReceivedDate` - Rastrean cuándo se recibió cada artefacto
- `notes` - Notas QA de propósito general

**Por qué:** Visual más clara (✓ o ◯), acciones más rápidas, menos escritura. Las fechas aún registran cuándo completó cada etapa para auditoría.

**Cómo se ve:**
- En el formulario: Checkboxes con etiquetas claras
- En la tabla: Checkmarks (✓) o círculos vacíos (◯) en columnas SQL, REST, gRPC, Matriz, QMetry
- Tooltips muestran la fecha cuando pasas el cursor

**Cambios técnicos:**
- `app.js`: Agregado soporte para `type: "checkbox"` en renderForm()
- `app.js`: Conversión correcta de booleanos en handleFormSubmit()
- `app.js`: Tabla muestra checkmarks en lugar de texto
- `server.py`: Datos de seed actualizados con valores booleanos
- Commit: `6e368e6`

---

### Versión 1.1.0 - Mejoras en Rastreo de Migraciones de SP

#### 1. Métricas de Progreso Mejoradas
- Agregadas 3 nuevas métricas en el tablero dashboard para visualizar progreso de SP:
  - **SP en migración**: Total de SPs con % completados
  - **SP en progreso**: Conteo activo y cuántos esperan entrada (SQL/REST/gRPC)
  - **SP listos QMetry**: Conteo de SPs listos para matriz y evidencia
- Razón: El equipo necesita visibilidad rápida del progress general sin entrar a la pestaña

#### 2. Rastreo de Fechas de Entrega
- Agregados 3 nuevos campos de fecha a cada SP:
  - **Fecha recepción SQL**: Cuándo se entregó el `.sql`
  - **Fecha recepción REST**: Cuándo se generó el endpoint REST
  - **Fecha recepción gRPC**: Cuándo se generó el método gRPC
- Razón: QA necesita rastrear línea de tiempo de entregas y detectar cuellos de botella
- Formato: ISO 8601 (YYYY-MM-DD), mismo que `dueDate` en tareas
- Los datos de seed incluyen fechas de ejemplo para desarrollo

#### 3. Validación de Transiciones de Estado
- Implementado flujo de estado estricto para SPs (no permite saltar etapas ni retroceder):
  - SQL recibido → REST/gRPC recibido → En QA → Matriz lista → Evidencia QMetry → En revision por banco → Finalizado
  - Permitido: Cualquier estado → Finalizado (cierre de emergencia)
  - No permitido: Saltos (ej: SQL recibido → En QA)
  - No permitido: Retrocesos (ej: En QA → REST/gRPC recibido)
  - Terminales: Finalizado no se puede cambiar
- Razón: Asegurar proceso consistente y evitar datos incoherentes
- Validación ocurre client-side (inmediato) y server-side (seguridad)
- Si la transición es inválida, aparece error y el SP no se actualiza

#### 4. Null Safety Defensivo
- Agregados optional chaining (?.) y nullish coalescing (??) en todo el código
- Previene errores "Cannot read properties of undefined"
- Aplicado a: renderMetrics(), renderList(), renderKanban(), optionsFor(), saveRecord(), findName()

---

## 2026-06-22 (Inicial)

- Se agrego la entidad `spMigrations` para rastrear la migracion de Stored Procedures a microservicios.
- Se creo una nueva pestaña de menu llamada `Migracion SP`, ubicada debajo de `Tareas`.
- La nueva vista permite registrar información sobre cada SP.
- Se actualizo el backend Python para crear la tabla SQLite correspondiente y exponerla en la API generica.
- Se actualizo el tablero con una metrica de SP en migracion.


