import { neon } from '@neondatabase/serverless';

const URL_BD =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

const sql = URL_BD ? neon(URL_BD) : null;

const MANANA = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30'];
const TARDE = ['15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'];

let tablaLista = false;

async function prepararTabla() {
  if (tablaLista) return;
  await sql`
    CREATE TABLE IF NOT EXISTS citas (
      id           BIGSERIAL PRIMARY KEY,
      fecha        DATE        NOT NULL,
      hora         TEXT        NOT NULL,
      nombre       TEXT        NOT NULL,
      telefono     TEXT        NOT NULL,
      email        TEXT,
      tratamiento  TEXT        NOT NULL,
      creada       TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (fecha, hora)
    )
  `;
  tablaLista = true;
}

function horasValidas(fecha) {
  const dia = new Date(fecha + 'T00:00:00').getUTCDay();
  if (dia === 0) return [];
  if (dia === 6) return MANANA;
  return [...MANANA, ...TARDE];
}

const esFecha = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const limpiar = (v, max) => String(v ?? '').trim().slice(0, max);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!sql) {
    return res.status(503).json({
      error: 'La agenda en línea no está configurada. Llámanos para tomar tu hora.',
    });
  }

  try {
    await prepararTabla();

    /* ---------- horas ocupadas de un día ---------- */
    if (req.method === 'GET') {
      const fecha = req.query.fecha;
      if (!esFecha(fecha)) return res.status(400).json({ error: 'Fecha inválida.' });

      const filas = await sql`SELECT hora FROM citas WHERE fecha = ${fecha}`;
      return res.status(200).json({ fecha, tomadas: filas.map((f) => f.hora) });
    }

    /* ---------- nueva reserva ---------- */
    if (req.method === 'POST') {
      const datos = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

      // campo trampa: si viene relleno, es un bot
      if (limpiar(datos.web, 50)) return res.status(200).json({ ok: true });

      const fecha = limpiar(datos.fecha, 10);
      const hora = limpiar(datos.hora, 5);
      const nombre = limpiar(datos.nombre, 120);
      const telefono = limpiar(datos.telefono, 40);
      const email = limpiar(datos.email, 160);
      const tratamiento = limpiar(datos.tratamiento, 80) || 'Consulta y diagnóstico';

      if (!esFecha(fecha)) return res.status(400).json({ error: 'Fecha inválida.' });

      const hoy = new Date().toISOString().slice(0, 10);
      if (fecha < hoy) return res.status(400).json({ error: 'Esa fecha ya pasó.' });

      if (!horasValidas(fecha).includes(hora)) {
        return res.status(400).json({ error: 'Esa hora no está dentro del horario de atención.' });
      }
      if (nombre.length < 2) return res.status(400).json({ error: 'Falta el nombre.' });
      if (telefono.replace(/\D/g, '').length < 8) {
        return res.status(400).json({ error: 'El teléfono no es válido.' });
      }

      const creada = await sql`
        INSERT INTO citas (fecha, hora, nombre, telefono, email, tratamiento)
        VALUES (${fecha}, ${hora}, ${nombre}, ${telefono}, ${email || null}, ${tratamiento})
        ON CONFLICT (fecha, hora) DO NOTHING
        RETURNING id
      `;

      if (!creada.length) {
        return res.status(409).json({ error: 'Esa hora ya está reservada.' });
      }
      return res.status(201).json({ ok: true, id: creada[0].id, fecha, hora });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Método no permitido.' });
  } catch (err) {
    console.error('citas:', err);
    return res.status(500).json({ error: 'Error del servidor. Inténtalo otra vez.' });
  }
}
