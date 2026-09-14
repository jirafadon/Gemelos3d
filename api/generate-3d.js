const TRIPO_API = 'https://api.tripo3d.ai/v2/openapi';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(body));
}

module.exports = async (req, res) => {
  const apiKey = process.env.TRIPO_API_KEY;
  if (!apiKey) return json(res, 503, { error: 'TRIPO_API_KEY no está configurada en Vercel.' });

  try {
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const prompt = String(body.prompt || '').trim();
      if (!prompt) return json(res, 400, { error: 'Falta la descripción del modelo.' });
      if (prompt.length > 1024) return json(res, 400, { error: 'La descripción no puede superar 1024 caracteres.' });

      const response = await fetch(`${TRIPO_API}/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          type: 'text_to_model',
          model_version: 'P1-20260311',
          prompt,
          texture: false,
          pbr: false,
          face_limit: 20000
        })
      });

      const data = await response.json();
      if (!response.ok || data.code) {
        return json(res, response.status || 502, { error: data.message || 'No se pudo crear la tarea.', code: data.code });
      }
      return json(res, 200, { taskId: data.data.task_id });
    }

    if (req.method === 'GET') {
      const taskId = String(req.query?.taskId || '').trim();
      if (!taskId) return json(res, 400, { error: 'Falta taskId.' });

      const response = await fetch(`${TRIPO_API}/task/${encodeURIComponent(taskId)}`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      const data = await response.json();
      if (!response.ok || data.code) {
        return json(res, response.status || 502, { error: data.message || 'No se pudo consultar la tarea.', code: data.code });
      }

      const task = data.data || {};
      return json(res, 200, {
        taskId: task.task_id,
        status: task.status,
        progress: task.progress ?? 0,
        modelUrl: task.output?.model || null,
        previewUrl: task.output?.rendered_image || task.output?.generated_image || null
      });
    }

    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'Método no permitido.' });
  } catch (error) {
    console.error('generate-3d:', error);
    return json(res, 500, { error: 'Error interno al comunicarse con el generador 3D.' });
  }
};
