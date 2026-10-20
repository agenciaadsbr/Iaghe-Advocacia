# LPs Direito Bancário e Previdenciário — Iaghe Advocacia

Site estático (HTML/CSS/JS sem build), no mesmo padrão das LPs da ADS BR no Vercel.

## Rotas

| Rota | Arquivo | Função |
|---|---|---|
| `/` | `index.html` | LP Direito Bancário |
| `/redirect` | `redirect.html` | Depois do envio do formulário bancário: aguarda 3 s e abre o WhatsApp do CRM com mensagem pronta. Acessada direto, sem envio, manda de volta ao formulário. |
| `/previdenciario` | `previdenciario.html` | LP Direito Previdenciário |
| `/redirect-previdenciario` | `redirect-previdenciario.html` | Mesmo fluxo do `/redirect`, com a mensagem do previdenciário |
| `/dashboard` | `dashboard.html` | Painel de leads com login (não indexado) |

## Arquivos

| Arquivo | Função |
|---|---|
| `assets/js/config.js` | **Único lugar para editar**: bloco de cada LP (`bancario`, `previdenciario`: serviço, mensagem, assuntos, rota do redirect) e o que é comum (WhatsApp, Supabase, OAB, endereço, Pixel). Cada HTML indica sua LP em `<html data-lp="...">`. |
| `assets/js/lead.js` | Validação, normalização do WhatsApp, UTMs, gravação no Supabase |
| `assets/js/main.js` | Header, animações, CTA fixo no celular, FAQ, formulário |
| `assets/js/redirect.js` | Lógica do `/redirect` |
| `assets/js/dashboard.js` | Login (Supabase Auth), gráfico diário, conversão por LP, tabela de leads |
| `assets/css/styles.css` | Tokens de cor/tipografia e todas as seções da LP |
| `assets/fonts/` | Poppins 400/600/700/800 (mesma fonte do site iagheadvocacia.com.br), hospedada no próprio site |
| `assets/img/` | WebP em duas larguras. Fotos reais (nas duas LPs): `dr-danyllo` (hero) e `equipe-retrato` (Escritório). Imagens geradas: bancário → `documentos` (Superendividamento) e `atendimento` (Como funciona); previdenciário → `beneficio` (Benefício negado) e `atendimento-prev` (Como funciona); as duas → `contato-fundo` (fundo escuro do formulário, 1600 desktop / 900 celular). |
| `assets/brand/` | Logo oficial (`logo-iaghe.png`, usada no header, rodapé e /redirect) e versão clara (`logo-iaghe-claro.png`, login do painel); ícones da aba `icon-32.png` e `icon-180.png` |
| `assets/og.jpg`, `assets/og-previdenciario.jpg` | Imagens de compartilhamento 1200×630 de cada LP |
| `vercel.json` | URLs limpas e cabeçalhos |

## Leads e visitas (Supabase "ADS BR CLIENTES", `qxhnjzyhtllmtdrcyygi`)

- As duas LPs gravam em `public.lp_leads` com `site = 'iag-advocacia'`. O `servico` diz de qual LP veio: `Direito Bancário` ou `Direito Previdenciário`, seguido do assunto quando escolhido (ex.: `Direito Previdenciário - BPC/LOAS`). Também vão `nome`, `whatsapp` (`55` + DDD + número) e `origem` (UTMs ou `direto`).
- Cada sessão grava uma visita por LP em `public.lp_visits` (mesmo `site`, com o `path` da página), sem dados pessoais.
- O painel separa a "Conversão por LP": visitas pelo `path`, leads pelo início do `servico`.
- RLS: o visitante (anon) só **insere**. Leitura exige login e uma linha em `lp_acessos` liberando o `site`.
- O WhatsApp só abre depois do HTTP 201 do banco. Erro de gravação mostra mensagem e não redireciona.

## Painel `/dashboard`

- Usuário na tela: **Admin** (mapeado para `admin@iag-advocacia.adsbr.internal` no Supabase Auth).
- A senha foi passada na conversa; não fica escrita aqui.
- Acesso liberado em `lp_acessos` só para `site = 'iag-advocacia'`.
- Para trocar a senha: `update auth.users set encrypted_password = crypt('NOVA', gen_salt('bf')) where email = 'admin@iag-advocacia.adsbr.internal';`

## Trocar quando o cliente enviar

- **OAB e endereço** já preenchidos com os dados do site do escritório (registro OAB/TO nº 0791). E-mail e CNPJ → campos em `institucional`; só aparecem quando preenchidos.
- **Assuntos dos botões** → lista `topics` de cada LP em `config.js` (e os botões no HTML da página). O assunto vai para `servico` e para a mensagem do WhatsApp.
- **Número do CRM** → `whatsappNumber` (confirmar antes de publicar). Hoje é o mesmo nas duas LPs; se o previdenciário tiver outro número, mover o campo para o bloco da LP.
- **Domínio** → adicionar `<link rel="canonical">` e trocar `og:image` para URL absoluta.
- **Meta Pixel** → só com ID real e abordagem de consentimento definida.
