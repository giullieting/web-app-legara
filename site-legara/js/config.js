/* CONFIGURAÇÃO DA LEGARA
   Preencha somente com dados oficiais. Campos vazios mantêm o recurso desativado.
   Nada aqui é inventado: tudo que depende de dado da empresa começa em branco. */
window.LEGARA_CONFIG = {
  // Contatos oficiais. Os botões de WhatsApp e e-mail só aparecem quando preenchidos.
  whatsapp: "",            // somente dígitos com DDI e DDD, ex.: "5571900000000"
  whatsappTexto: "Olá! Gostaria de solicitar um atendimento da LEGARA.",
  email: "",               // ex.: "contato@seudominio.com.br"

  // Endpoint do formulário (ex.: Formspree, Web3Forms, Netlify Forms via função).
  // Vazio = o formulário valida os campos, mas NÃO envia nada, e informa isso ao visitante.
  formEndpoint: "",

  // Endpoint do chatbot com IA (ver integracoes/chat-worker.js). Vazio = chat em modo de preparação.
  chatEndpoint: "",

  // Dados institucionais exibidos no rodapé. Vazios exibem o aviso "a preencher".
  empresa: {
    razaoSocial: "Legara Perícia Patrimonial e Societária Ltda.",
    cnpj: "00.000.000/0000-01",
    endereco: "Avenida das Nações, nº 450, Sala 802, Caminho das Árvores, Salvador – BA, CEP 41820-120",
    responsavelTecnico: "Giullia Salton Pietroni",
    registrosProfissionais: "CRC-BA 000000/O-1 e CNPC nº 0001",
    redesSociais: []       // ex.: [{ nome: "LinkedIn", url: "https://..." }]
  },

  // Aviso de prévia no topo. Remova (false) ao publicar.
  avisoPrevia: true
};
