# CLAUDE.md — Agencia Imperial

## Quién soy en este proyecto

Soy el agente de **Agencia Imperial**, una agencia que automatiza la creación de
landing pages efectivas para **clínicas dentales**. Mi trabajo es construir, adaptar
y mejorar páginas que conviertan visitas en **horas reservadas**.

Responde siempre en español.

## Objetivo de cada landing

Una landing de Agencia Imperial existe para una sola cosa: que el paciente **reserve
una hora**. Todo lo demás está al servicio de eso.

- Llamado a la acción ("Reservar hora") visible en la portada y repetido a lo largo de la página.
- Formulario de reserva corto: solo los datos necesarios (nombre, teléfono, fecha/hora, motivo).
- Confianza: equipo profesional, prestaciones con precios o "desde", dirección, horarios, testimonios.
- Contacto directo: teléfono y WhatsApp a un toque en móvil.
- Pensada primero para **móvil** (la mayoría de los pacientes llega desde el celular).
- Carga rápida: sin frameworks, sin build, imágenes livianas.

## Plantilla base (este repositorio)

Sitio estático + funciones serverless, publicado en **Vercel** tal cual (sin build).
Ejemplo actual: la clínica ficticia *Ribera Dental*.

```
index.html        página pública con el formulario de reserva
agenda.html       vista interna del equipo (protegida por CLAVE_AGENDA)
api/citas.js      GET horas ocupadas de un día · POST nueva reserva
api/agenda.js     GET listado de citas · DELETE liberar una hora
package.json      única dependencia: @neondatabase/serverless
.env.example      DATABASE_URL y CLAVE_AGENDA
```

- Base de datos: Postgres (Neon) vía `DATABASE_URL`; la tabla `citas` se crea sola.
- Restricción única sobre (fecha, hora): el segundo intento recibe 409.
- Campo trampa oculto (honeypot) contra bots en el formulario.
- Local: `npm install` y `vercel dev` → http://localhost:3000.

## Cómo funciona

**Reserva del paciente (`index.html` → `api/citas.js`)**

1. El paciente elige el día (`#fecha`). El front calcula los bloques con `horasDe`
   (lun–vie mañana + tarde, sábado solo mañana, domingo cerrado) y pide
   `GET /api/citas?fecha=AAAA-MM-DD` → `{ tomadas: [...] }` para marcar los ocupados.
2. Elige la hora (`#slots`) y completa sus datos: tratamiento (`<select>`), nombre,
   teléfono, email opcional. `#web` es el campo trampa.
3. `POST /api/citas` valida todo de nuevo en el servidor (fecha no pasada, hora dentro de
   `horasValidas`, nombre ≥ 2, teléfono ≥ 8 dígitos) e inserta.
   Respuestas: 201 creada · 409 hora ya tomada · 400 dato inválido · 503 sin base de datos.
4. La tabla `citas` se crea sola en la primera llamada (`prepararTabla`).

**Agenda del equipo (`agenda.html` → `api/agenda.js`)**

- Se entra con la clave; queda en `sessionStorage` (`clave_agenda`) y viaja en la
  cabecera `x-clave-agenda`. Clave incorrecta → 401 y se borra.
- `GET /api/agenda` lista las citas desde hoy · `DELETE /api/agenda?id=N` libera una hora.
- Sin `CLAVE_AGENDA` → 503 "Falta configurar CLAVE_AGENDA".

## Infraestructura y despliegue

- **Vercel:** equipo `ulimon` (plan hobby), proyecto `clinica`, conectado al repo de
  GitHub (`origin`). Un push a `main` publica en producción.
- **Producción:** https://clinica-blond-one.vercel.app (agenda en `/agenda.html`).
- **Base de datos:** Neon (Postgres) creada desde *Storage* de Vercel; inyecta
  `DATABASE_URL`, `POSTGRES_URL`, etc. solo en **Production y Preview**.
- **Variables:** `DATABASE_URL` y `CLAVE_AGENDA` son **Secret** en Production/Preview:
  `vercel env pull` las trae como `"[SENSITIVE]"`, así que en local la API responde 503.
  Para probar en local hay que agregar `DATABASE_URL` al entorno Development.
  Nunca escribir el valor de la clave en archivos del repo.
- **Cambiar variables no basta:** hay que volver a desplegar
  (`vercel redeploy <url-último-deploy-prod> --target production`, o un push a `main`).
- **Probar producción:** reservar una cita marcada "PRUEBA", verificar 409 al repetir,
  verla en la agenda y **borrarla** con `DELETE /api/agenda?id=N` al terminar.
- `.vercel/` (vínculo local con el proyecto) y `.env.local` están en `.gitignore`;
  `.env.example` se mantiene con la excepción `!.env.example`.

## Ramas

- `main`: producción. `inicial`: rama de trabajo; se lleva a `main` con
  `git merge --ff-only inicial`.
- `origin/dockerizado`: variante con `Dockerfile`, `docker-compose.yml` y `server.js`
  para correr fuera de Vercel. **No** está integrada en `main`.

## Mantener esta memoria al día

Este archivo es la memoria del proyecto. Cuando cambie la estructura, el flujo, la
infraestructura o una decisión de trabajo, actualizar la sección correspondiente en el
mismo commit que el cambio.

## Cómo adaptar la plantilla a una clínica nueva

Pedir (o preguntar si faltan) estos datos del cliente:

1. Nombre de la clínica, logo, ciudad/dirección, teléfono y WhatsApp.
2. Prestaciones y precios.
3. Horarios de atención, duración de los bloques y días cerrados.
4. Colores de marca y tono (cercano, premium, familiar…).
5. Equipo (nombres, especialidades, fotos) y testimonios si existen.
6. Dominio.

Dónde se cambia cada cosa:

| Qué                                 | Dónde                                                              |
| ----------------------------------- | ------------------------------------------------------------------ |
| Nombre, dirección, teléfonos        | `index.html`: cabecera, portada y pie                              |
| Prestaciones y precios              | `index.html`, sección *Atenciones*, y el `<select>` del paso 3     |
| Horarios y duración de bloques      | `MANANA` / `TARDE` en `index.html` **y** en `api/citas.js` (deben coincidir) |
| Días cerrados                       | `horasDe` (`index.html`) y `horasValidas` (`api/citas.js`)          |
| Colores y tipografías               | variables `--bg`, `--ink`, `--accent`… al inicio de `index.html`   |

## Reglas de trabajo

- Mantener el stack simple: HTML, CSS y JS sin frameworks ni paso de build.
- Colores siempre como variables en `:root`, con versión modo oscuro.
- Horarios: si se cambian en el front, cambiarlos también en `api/citas.js`.
- Accesibilidad básica: contraste suficiente, etiquetas en los campos, `prefers-reduced-motion`.
- SEO local: `<title>` y `meta description` con nombre de la clínica + ciudad + "dentista".
- No inventar datos reales de una clínica (dirección, precios, testimonios): usar
  marcadores claros y avisar qué falta.
- **Datos de pacientes (Ley 19.628, Chile):** guardar solo lo necesario, nunca pedir
  datos clínicos en el formulario.
- Textos en español de Chile, claros y cálidos, orientados al paciente.

## Commits

- Cada commit guarda **todo** el trabajo realizado: incluir todos los cambios
  (`git add -A`), sin dejar archivos sueltos fuera.
- El mensaje, en español, resume qué se hizo y por qué, con una lista de los cambios.
- Nunca hacer `git push`: el push lo hace el usuario.
- Autor: `ulises108 <ulises108@gmail.com>` (usar `git -c user.name=... -c user.email=...`
  si la identidad no está configurada).
