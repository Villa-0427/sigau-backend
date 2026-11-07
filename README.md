# SIGAU — Backend (API REST)

Sistema de Gestión Académica Universitaria — Proyecto Final Bases de Datos 1, Universidad El Bosque.
Implementa el modelo de la **Fase 1** (14 tablas, RF-01…RF-14, S-01…S-15, RB-01…RB-13, validaciones de la §2.3 y las 50 consultas del Anexo A).

**Stack:** Node.js 18+ · TypeScript · Express · MySQL 8.0.16+ (`mysql2`) · zod · vitest

## 1. Requisitos
- Node.js 18 o superior (`node -v`)
- MySQL Server 8.0.16 o superior (necesario para los `CHECK`). En Windows: *MySQL Installer* → *MySQL Server* + *MySQL Workbench*. En la VM Linux: `sudo apt install mysql-server`.

## 2. Puesta en marcha (WebStorm)
1. **File → Open** y selecciona la carpeta `sigau-backend`.
2. Copia `.env.example` como `.env` y escribe el usuario y la contraseña de tu MySQL.
3. En la terminal de WebStorm:
   ```bash
   npm install
   npm run db:init      # crea la BD "sigau" (la borra si ya existe) y carga los datos de prueba
   npm run dev          # http://localhost:3000 con recarga automática
   ```
   WebStorm muestra los scripts de `package.json` en la ventana **npm**; también puedes ejecutarlos con doble clic.
4. Abre `http/sigau.http`, elige el entorno **dev** y ejecuta las peticiones (▶ o *Run All*). Cada una indica el código HTTP esperado.
   Para volver a los datos iniciales: `npm run db:init`.

Alternativa sin el script: ejecuta `database/01_schema.sql` y luego `database/02_seed.sql` en MySQL Workbench.

| Script | Qué hace |
|---|---|
| `npm run dev` | Levanta la API con recarga automática (tsx) |
| `npm run build` / `npm start` | Compila a `dist/` y ejecuta la versión compilada |
| `npm run db:init` | Ejecuta esquema + datos (`-- --sin-datos` sólo el esquema) |
| `npm run db:consultas` | Regenera `database/03_consultas.sql` desde el catálogo de la API |
| `npm test` | Pruebas unitarias de las reglas de negocio y del catálogo de consultas |
| `npm run typecheck` | Verificación de tipos |

## 3. Arquitectura (RNF-03)
```
src/
  modules/<módulo>/
    *.controller.ts   presentación: rutas HTTP, lectura de parámetros
    *.schemas.ts      validación de entrada (dominios, formatos) con zod
    *.service.ts      lógica de negocio (reglas RB/S/RF, transacciones)
    *.repository.ts   acceso a datos: SQL parametrizado con "?" (RNF-04)
  domain/rules.ts     reglas puras (cruces de horario, notas, ciclos…) probadas con vitest
  common/             errores, utilidades HTTP, listas de dominio
  db/pool.ts          pool MySQL y helper de transacciones
database/             01_schema.sql · 02_seed.sql · 03_consultas.sql
http/sigau.http       escenarios de prueba para WebStorm
```
Los errores devuelven JSON con la regla incumplida:
```json
{ "error": { "status": 422, "regla": "RF-12", "mensaje": "No cumple prerrequisitos para BD101: debe aprobar PRG101 (Programación I)" } }
```
`400` entrada inválida · `404` no existe · `409` duplicado/integridad · `422` regla de negocio · `503` sin conexión a MySQL.

## 4. Endpoints
| Recurso | Operaciones |
|---|---|
| `/api/personas` | CRUD; `?rol=estudiante\|docente&q=texto`; roles: `POST/PUT/DELETE /:id/estudiante` y `/:id/docente` |
| `/api/programas` | CRUD; plan de estudio: `GET/POST /:id/plan`, `PUT/DELETE /:id/plan/:idAsignatura` |
| `/api/asignaturas` | CRUD; `GET/POST /:id/prerrequisitos`, `DELETE /:id/prerrequisitos/:idRequerida`, `GET /:id/grupos?periodo=` |
| `/api/periodos` | CRUD; `PATCH /:id/estado` (Planeado→Activo→Cerrado); `GET /:id/oferta` |
| `/api/aulas` | CRUD; `GET /:id/horarios?periodo=` |
| `/api/grupos` | CRUD; filtros `?periodo&asignatura&docente&modalidad`; `GET /:id/estudiantes`; horarios `GET/POST /:id/horarios`, `PUT/DELETE /:id/horarios/:idHorario` |
| `/api/matriculas` | `GET`, `GET /:id`, `POST`, `PATCH /:id/estado` (Cancelada/Finalizada), `DELETE`; inscribir: `POST /:id/detalles` |
| `/api/detalles/:id` | `PATCH /retirar`; nota: `GET/PUT/DELETE /calificacion` |
| `/api/calificaciones` | `?periodo&grupo&estudiante&asignatura` |
| `/api/estudiantes` | `?programa=`; `GET /:id/historial` (promedio ponderado); `GET /:id/horario?periodo=` |
| `/api/docentes/:id/grupos` | grupos del docente con sus estudiantes |
| `/api/consultas` | catálogo de las 50 consultas; `GET /:n` las ejecuta (parámetros por query string, p. ej. `/42?grupos=4,6`) |

## 5. Reglas de negocio implementadas
| Regla | Dónde se garantiza |
|---|---|
| RB-01 / RB-02 documento y correo únicos | UQ en BD + verificación previa con mensaje claro |
| S-02 especialización total y solapada | La persona se crea con ≥1 rol en una transacción; no se puede quitar el último rol |
| RB-03 estudiante con programa existente | FK + verificación en servicio |
| RB-04 / RB-05 plan sin duplicados, semestre > 0 | PK compuesta + CHECK + zod |
| S-04 código único, créditos > 0 | UQ + CHECK + zod |
| S-14 inicio < fin del periodo | CHECK + servicio (también evita traslapes entre periodos) |
| RB-06 grupo con asignatura, docente **activo** y periodo válidos | FK + servicio; no se abren grupos en periodos cerrados |
| RB-07 código de grupo único por asignatura y periodo | UQ compuesta |
| RB-08 una matrícula por estudiante y periodo | UQ; sólo estudiantes Activos y periodos no cerrados |
| RB-09 / S-10 sin inscripción duplicada ni dos grupos de la misma asignatura | UQ + servicio |
| RB-10 / S-12 nota 0.00–5.00, dos decimales | CHECK + `DECIMAL(3,2)` + zod |
| S-11 0..1 calificación por detalle | PK = FK `id_detalle` |
| RB-11 hora inicio < hora fin | CHECK + servicio |
| RB-12 capacidad del aula ≥ cupo del grupo | Servicio (al crear horarios, cambiar cupo o reducir capacidad) |
| RB-13 prerrequisitos distintos, sin duplicar **ni ciclos** | CHECK + PK + búsqueda en grafo |
| §2.3 sin cruces de horario de grupo, aula, docente **y estudiante** | Servicio (consultas de solapamiento) |
| §2.3 cumplimiento real de prerrequisitos (nota ≥ 3.0) | Servicio al inscribir |
| Cupo disponible | Servicio con bloqueo `SELECT … FOR UPDATE` |

Reglas adicionales razonables que **no** están literalmente en el documento (conviene validarlas con el docente): la asignatura debe pertenecer al plan del programa del estudiante, no se inscribe una asignatura ya aprobada, los periodos no se traslapan y, al cerrar un periodo, sus matrículas activas pasan a *Finalizada* y las notas quedan congeladas.

## 6. Datos de prueba
3 programas, 12 personas (Diana es estudiante y docente; Ricardo es docente sin grupos; Santiago es estudiante sin matrícula), 11 asignaturas con cadena de prerrequisitos, 3 periodos (2026-1 cerrado, 2026-2 activo, 2027-1 planeado), 6 aulas, 12 grupos, 20 horarios, 12 matrículas, 23 inscripciones y 14 notas. Están diseñados para que las 50 consultas devuelvan filas. El grupo 12 está programado a propósito en un aula de 15 puestos con cupo 30 para que la consulta 47 (auditoría) tenga resultado: la API no permitiría crear ese caso.

## 7. Observaciones sobre el documento de Fase 1
- **Consulta 50:** la expresión del documento hace la diferencia a nivel de estudiante, así que excluye a cualquiera que tenga *alguna* nota. Para que cumpla el enunciado ("sin calificación en alguno de sus detalles") la diferencia debe hacerse sobre `id_detalle`. El catálogo incluye la expresión corregida.
- **Consulta 49:** se escribió explícita la reunión por `id_asignatura`, como pide la observación del Anexo A.
- **PRERREQUISITO:** MySQL no permite `ON DELETE CASCADE` en columnas usadas por un `CHECK`, por eso sus FK quedan en `RESTRICT` y el servicio borra los prerrequisitos antes de eliminar una asignatura.
