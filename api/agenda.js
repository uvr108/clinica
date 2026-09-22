import { neon } from '@neondatabase/serverless';

const URL_BD =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

const sql = URL_BD ? neon(URL_BD) : null;

/**
 * Agenda interna del equipo.
 *   GET    /api/agenda?clave=...            -> próximas citas
 *   DELETE /api/agenda?clave=...&id=12      -> liberar una hora
 * La clave se guarda en la variable de entorno CLAVE_AGENDA.
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const esperada = process.env.CLAVE_AGENDA;
  if (!esperada) {
    return res.status(503).json({ error: 'Falta configurar CLAVE_AGENDA en Vercel.' });
  }
  if (!sql) {
    return res.status(503).json({ error: 'Falta configurar la base de datos.' });
  }

  const clave = req.headers['x-clave-agenda'] || req.query.clave || '';
  if (String(clave) !== esperada) {
    return res.status(401).json({ error: 'Clave incorrecta.' });
  }

  try {
    if (req.method === 'GET') {
      const desde = new Date().toISOString().slice(0, 10);
      const filas = await sql`
        SELECT id, fecha::text AS fecha, hora, nombre, telefono, email, tratamiento
        FROM citas
        WHERE fecha >= ${desde}
        ORDER BY fecha ASC, hora ASC
        LIMIT 500
      `;
      return res.status(200).json({ citas: filas });
    }

    if (req.method === 'DELETE') {
      const id = Number(req.query.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'Id inválido.' });
      await sql`DELETE FROM citas WHERE id = ${id}`;
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, DELETE');
    return res.status(405).json({ error: 'Método no permitido.' });
  } catch (err) {
    console.error('agenda:', err);
    return res.status(500).json({ error: 'Error del servidor.' });
  }
}
