# Site LEGARA: guia de edição e publicação gratuita

## Como editar sem programar
- `js/content.js`: todos os textos (serviços, FAQ, missão, artigos, chatbot).
- `js/config.js`: WhatsApp, e-mail, endpoint do formulário, endpoint do chat, razão social, CNPJ, endereço, responsável técnico, registros, redes sociais.
- Campos vazios mantêm o recurso desativado (botões de contato ocultos, rodapé com "a preencher").
- Artigos: `js/artigos.js`. Copie um bloco, mude os campos e cole o texto em Markdown em `corpo`. Confira normas e dados técnicos antes de publicar. Categorias em `content.js`.
- Áreas complementares: edite `complementares` em `content.js` (título, descrição e aplicações).
- Antes de publicar: `avisoPrevia: false`, revisar a política de privacidade com assessoria jurídica e substituir o logo por arquivos vetoriais (SVG), se existirem.

## O que funciona no plano gratuito (verificado em 20/10/2026; confirme nos sites oficiais)
| Recurso | Opção gratuita | Limite / observação |
|---|---|---|
| Hospedagem | Cloudflare Pages, Netlify ou GitHub Pages | Site estático. Endereço no subdomínio da plataforma (ex.: `legara.pages.dev`). |
| Domínio próprio | Possível conectar | O registro do domínio (ex.: .com.br) é pago, anual, pago ao registrador. |
| Formulário | Formspree (plano gratuito) | 50 envios por mês, histórico de 30 dias, até 2 e-mails de notificação. Acima disso, plano pago. |
| Chatbot com IA | Cloudflare Workers AI via `integracoes/chat-worker.js` | 10.000 "Neurons" por dia no plano gratuito, com reinício diário; ao exceder, as chamadas falham. Acima disso, plano pago. Modelos e limites mudam: confira. |
| Edição de textos sem código | Editar `content.js` e publicar de novo | Não há painel visual. Um CMS (ex.: Decap CMS) é uma evolução possível. |

## O que NÃO está ativo nesta versão
- O formulário valida os campos, mas só envia depois que `formEndpoint` for configurado. Sem isso, informa ao visitante que nada foi enviado.
- O chat tem interface, atalhos e avisos de privacidade. A IA só responde depois de configurar `chatEndpoint`. Nenhuma resposta é simulada.
- Os textos são renderizados por JavaScript a partir de `content.js`. Para SEO mais forte, uma etapa de geração estática pode ser adicionada depois.

## Arquivos
`index.html`, `css/style.css`, `js/app.js`, `assets/` (logos), `integracoes/chat-worker.js`, `build.py` (gera `dist/index.html` com tudo embutido).

## Calculadoras e Simuladores
Seção `#simuladores` (lista em `simuladores.ferramentas` no `js/content.js`: título, resumo, texto de abertura). Quatro ferramentas: SAC x Price, Simulador de amortização (4 sistemas), Amortização antecipada e Conferência da evolução do financiamento. Código em `js/simulador.js` e `js/calculadoras.js`. As planilhas Excel só trazem valores calculados e o aviso de uso. Rode `python3 build.py` após editar.
