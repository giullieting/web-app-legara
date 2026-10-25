// Chatbot da LEGARA: Cloudflare Worker + Workers AI. NÃO TESTADO em produção: valide antes de publicar.
// Passos: crie um Worker, adicione o binding de IA com o nome "AI", cole este código, publique,
// e coloque a URL do Worker em chatEndpoint (js/config.js). Troque ALLOWED_ORIGIN pelo domínio do site.
const ALLOWED_ORIGIN = "https://SEU-SITE.pages.dev";
const MODEL = "@cf/meta/llama-3.1-8b-instruct"; // confira o catálogo atual de modelos

// Base de conhecimento: copie aqui os textos aprovados (serviços, FAQ, atendimento) de js/content.js.
const KNOWLEDGE = `
[COLE AQUI O CONTEÚDO INSTITUCIONAL APROVADO PELA LEGARA]
`;

const SYSTEM = `Você é o Assistente Virtual LEGARA, atendimento inicial de uma empresa de perícia patrimonial e societária.
Responda em português do Brasil, de forma clara, educada e breve.
Use SOMENTE a base de conhecimento abaixo. Se faltar informação, diga que não tem dados suficientes e ofereça o formulário de contato ou um profissional.
Não invente informações sobre a empresa, profissionais, preços, prazos ou serviços. Não prometa resultados.
Não emita pareceres jurídicos, contábeis, tributários ou previdenciários individualizados.
Não peça nem aceite senhas, dados bancários, documentos pessoais ou sigilosos; oriente o visitante a não enviá-los.
Informe, quando útil, que as mensagens são tratadas conforme a política de privacidade do site.
BASE DE CONHECIMENTO:
${KNOWLEDGE}`;

export default {
  async fetch(req, env) {
    const cors = { "Access-Control-Allow-Origin": ALLOWED_ORIGIN, "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return new Response("Método não permitido", { status: 405, headers: cors });
    let body;
    try { body = await req.json(); } catch { return new Response("JSON inválido", { status: 400, headers: cors }); }
    const messages = (body.messages || []).slice(-10).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "").slice(0, 500) }));
    try {
      const out = await env.AI.run(MODEL, { messages: [{ role: "system", content: SYSTEM }, ...messages] });
      return new Response(JSON.stringify({ reply: out.response }), { headers: { ...cors, "Content-Type": "application/json" } });
    } catch (e) {
      return new Response(JSON.stringify({ reply: "" }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
    }
  }
};
