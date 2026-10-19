# LP Direito Bancário — Iaghe Advocacia

Site estático (HTML/CSS/JS sem build), no mesmo padrão das LPs da ADS BR no Vercel.

## Rotas

| Rota | Arquivo | Função |
|---|---|---|
| `/` | `index.html` | Landing page |
| `/redirect` | `redirect.html` | Depois do envio do formulário: aguarda 3 s e abre o WhatsApp do CRM com mensagem pronta. Acessada direto, sem envio, manda de volta ao formulário. |
| `/dashboard` | `dashboard.html` | Painel de leads com login (não indexado) |

## Arquivos

| Arquivo | Função |
|---|---|
| `assets/js/config.js` | **Único lugar para editar**: `site`, número do WhatsApp, mensagem, Supabase, OAB, logotipo, endereço, e-mail, CNPJ, Pixel |
| `assets/js/lead.js` | Validação, normalização do WhatsApp, UTMs, gravação no Supabase |
| `assets/js/main.js` | Header, animações, CTA fixo no celular, FAQ, formulário |
| `assets/js/redirect.js` | Lógica do `/redirect` |
| `assets/js/dashboard.js` | Login (Supabase Auth), gráfico diário, conversão por LP, tabela de leads |
| `assets/css/styles.css` | Tokens de cor/tipografia e todas as seções da LP |
| `assets/fonts/` | Newsreader (títulos) e Figtree (texto), hospedadas no próprio site |
| `assets/img/` | WebP em duas larguras: `equipe-retrato` (hero), `atendimento` (Como funciona, imagem gerada recortada sem o martelo), `dr-danyllo` (Escritório) — fotos reais do escritório; `documentos` (Superendividamento, imagem gerada recortada sem moedas). |
| `assets/brand/` | Logo oficial (`logo-iaghe.png`, original) e versão clara para fundo escuro (`logo-iaghe-claro.png`, usada no header, rodapé, /redirect e login do painel); ícones da aba `icon-32.png` e `icon-180.png` (coluna dourada da marca) |
| `assets/og.jpg` | Imagem de compartilhamento 1200×630 |
| `vercel.json` | URLs limpas e cabeçalhos |

## Leads e visitas (Supabase "ADS BR CLIENTES", `qxhnjzyhtllmtdrcyygi`)

- Formulário grava em `public.lp_leads` com `site = 'iag-advocacia'`, `servico = 'Direito Bancário'`, `nome`, `whatsapp` (`55` + DDD + número) e `origem` (UTMs ou `direto`).
- Cada sessão grava uma visita em `public.lp_visits` (mesmo `site`), sem dados pessoais.
- RLS: o visitante (anon) só **insere**. Leitura exige login e uma linha em `lp_acessos` liberando o `site`.
- O WhatsApp só abre depois do HTTP 201 do banco. Erro de gravação mostra mensagem e não redireciona.

## Painel `/dashboard`

- Usuário na tela: **Admin** (mapeado para `admin@iag-advocacia.adsbr.internal` no Supabase Auth).
- A senha foi passada na conversa; não fica escrita aqui.
- Acesso liberado em `lp_acessos` só para `site = 'iag-advocacia'`.
- Para trocar a senha: `update auth.users set encrypted_password = crypt('NOVA', gen_salt('bf')) where email = 'admin@iag-advocacia.adsbr.internal';`

## Trocar quando o cliente enviar

- **OAB, endereço, e-mail, CNPJ** → campos em `institucional`; só aparecem quando preenchidos.
- **Número do CRM** → `whatsappNumber` (confirmar antes de publicar).
- **Domínio** → adicionar `<link rel="canonical">` e trocar `og:image` para URL absoluta.
- **Meta Pixel** → só com ID real e abordagem de consentimento definida.
