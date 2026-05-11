exports.handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ content: [{ type: 'text', text: 'GEMINI_API_KEY não encontrada' }] }) };
  }

  try {
    const body = JSON.parse(event.body);
    const contents = [];

    for (const msg of body.messages) {
      if (typeof msg.content === 'string') {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      } else if (Array.isArray(msg.content)) {
        const parts = [];
        for (const part of msg.content) {
          if (part.type === 'text') parts.push({ text: part.text });
          else if (part.type === 'image') parts.push({ inlineData: { mimeType: part.source.media_type, data: part.source.data } });
        }
        contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts });
      }
    }

    const geminiBody = { contents, generationConfig: { maxOutputTokens: 1000 } };
    if (body.system) {
      geminiBody.systemInstruction = { parts: [{ text: body.system }] };
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiBody) }
    );

    const data = await response.json();

    if (data.error) {
      return { statusCode: 200, headers, body: JSON.stringify({ content: [{ type: 'text', text: 'Erro Gemini: ' + data.error.message }] }) };
    }

    const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta.';
    return { statusCode: 200, headers, body: JSON.stringify({ content: [{ type: 'text', text: texto }] }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ content: [{ type: 'text', text: 'Erro interno: ' + err.message }] }) };
  }
};
