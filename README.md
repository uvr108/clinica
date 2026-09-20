# Clínica dental — sitio con reserva de horas

Sitio estático + dos funciones serverless. Sin frameworks ni build: Vercel lo publica tal cual.

```
index.html        página pública con el formulario de reserva
agenda.html       vista interna del equipo (protegida por clave)
api/citas.js      GET horas ocupadas de un día · POST nueva reserva
api/agenda.js     GET listado de citas · DELETE liberar una hora
package.json      única dependencia: @neondatabase/serverless
.env.example      variables que hay que configurar
```

## 1. Subir el proyecto

Necesitas una cuenta en [vercel.com](https://vercel.com). Dos caminos, elige uno.

**Con GitHub (recomendado, queda con despliegue automático)**

1. Crea un repositorio nuevo y sube esta carpeta.
2. En Vercel: **Add New → Project → Import** el repositorio.
3. Framework Preset: **Other**. Deja Build Command y Output Directory vacíos.
4. **Deploy**.

**Desde el terminal**

```bash
npm i -g vercel
cd clinica-dental-vercel
vercel          # primer despliegue de prueba
vercel --prod   # publicar
```

## 2. Crear la base de datos

Las horas se guardan en Postgres. Desde el proyecto ya creado en Vercel:

1. Pestaña **Storage → Create Database → Neon (Postgres)**, plan gratuito.
2. Conéctala al proyecto. Vercel inyecta sola la variable `DATABASE_URL`.
3. La tabla `citas` se crea sola en la primera visita, no tienes que tocar SQL.

Si prefieres otro proveedor (Supabase, Neon directo, Railway), sirve igual: basta con
que `DATABASE_URL` apunte a un Postgres.

## 3. Clave de la agenda interna

En **Settings → Environment Variables** agrega:

| Nombre         | Valor                          |
| -------------- | ------------------------------ |
| `CLAVE_AGENDA` | la contraseña que tú elijas    |

Vuelve a desplegar (**Deployments → ... → Redeploy**) para que tome las variables.
Después entras en `https://tu-dominio.vercel.app/agenda.html`, escribes la clave y ves
todas las horas reservadas, con el teléfono de cada paciente y un botón para liberar una hora.

## 4. Dominio propio

**Settings → Domains → Add**. Si compraste el dominio en NIC Chile, apunta los DNS a Vercel
con los datos que la misma pantalla te indica. El certificado HTTPS es automático.

## Trabajar en local

```bash
npm install
vercel dev      # levanta el sitio y las funciones en http://localhost:3000
```

Para el local, copia `.env.example` a `.env` y rellena `DATABASE_URL` y `CLAVE_AGENDA`,
o ejecuta `vercel env pull` para traer las variables del proyecto.

## Qué cambiar para tu clínica

| Qué                              | Dónde                                                          |
| -------------------------------- | -------------------------------------------------------------- |
| Nombre, dirección, teléfonos     | `index.html`: cabecera, portada y pie                           |
| Prestaciones y precios           | `index.html`, sección *Atenciones*, y el `<select>` del paso 3  |
| Horarios y duración de los bloques | `MANANA` / `TARDE` en `index.html` **y** en `api/citas.js` (deben coincidir) |
| Días cerrados                    | función `horasDe` (`index.html`) y `horasValidas` (`api/citas.js`) |
| Colores y tipografías            | variables `--bg`, `--ink`, `--accent`… al inicio de `index.html` |

## Cosas que conviene saber

- **El aviso al paciente es manual.** El sistema guarda la hora, no envía correos ni
  WhatsApp. Si quieres confirmación automática, lo más simple es agregar
  [Resend](https://resend.com) en `api/citas.js` después del INSERT.
- **Dos personas no pueden tomar el mismo bloque**: la tabla tiene una restricción única
  sobre (fecha, hora) y el segundo intento recibe un 409.
- **Datos de pacientes.** Estás guardando nombre, teléfono y motivo de consulta en un
  servidor propio. Guarda solo lo necesario, no agregues datos clínicos al formulario y
  ten a la vista la Ley 19.628 sobre protección de datos personales.
- El formulario trae un campo trampa oculto contra bots. Si recibes spam igual, lo
  siguiente sería un límite por IP o un captcha.
# clinica
