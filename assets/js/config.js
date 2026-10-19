/*
 * Configuração central da LP — Direito Bancário | Iaghe Advocacia
 * ---------------------------------------------------------------
 * Tudo que muda com frequência fica aqui: número do WhatsApp do CRM,
 * mensagem, backend de leads e dados institucionais confirmados.
 * Campos institucionais vazios (null) simplesmente não aparecem na página.
 */
window.IAG_CONFIG = Object.freeze({
  // Identificação desta LP no banco multi-cliente (coluna "site" de lp_leads / lp_visits)
  site: "iag-advocacia",
  servico: "Direito Bancário",

  // WhatsApp do CRM/agente — formato internacional, só dígitos.
  // ATENÇÃO: número informado no start (25/09/2026), ainda a confirmar com o escritório antes de publicar.
  whatsappNumber: "5563999451967",
  whatsappMessage:
    "Olá, preenchi o formulário da página de Direito Bancário da Iaghe Advocacia e gostaria de conversar.",
  redirectDelayMs: 3000,

  // Backend: Supabase "ADS BR CLIENTES" (tabela compartilhada lp_leads, RLS: anon só insere, ninguém anônimo lê).
  // A chave abaixo é a chave pública (anon) — feita para ficar no front-end. Não colocar service_role aqui.
  supabaseUrl: "https://qxhnjzyhtllmtdrcyygi.supabase.co",
  supabaseAnonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4aG5qenlodGxsbXRkcmN5eWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMzczNjgsImV4cCI6MjA5NzgxMzM2OH0.DWf4I_x9F--H7ZZHUt_n4V3B__Nlsf1jNZdUV0vNBLU",

  // Dados institucionais — preencher somente com informação validada pelo escritório.
  institucional: {
    advogado: "Dr. Danyllo Iaghe",
    oab: null, // ex.: "OAB/TO 0000"
    fotoAdvogado: null, // ex.: "/assets/img/dr-danyllo.webp" (foto real, proporção 4:5)
    logotipo: null, // ex.: "/assets/img/logo-iag.svg" — substitui a marca tipográfica provisória
    endereco: null,
    email: null,
    cnpj: null,
  },

  // Mensuração — só ativar com ID real e abordagem de consentimento definida.
  metaPixelId: null,

  // true só na prévia de revisão: valida o formulário mas não grava nem redireciona.
  previewMode: false,
});
