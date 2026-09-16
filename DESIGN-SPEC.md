# SPEC DE DESIGN COMPLETA — O INTERMEDIÁRIO
# Extrair todos os valores diretamente do código fonte

## IDADE VISUAL GERAL
- **Marca:** "O Intermediário" (sem sufixo .co.ao no UI)
- **Tom:** Marketplace profissional, limpo, mobilidade-first
- **Ícones:** Emojis como ícones (🚗🏠💼🛠📱💻🪑👕📦) + SVGs inline pequenos
- **Sem biblioteca de ícones externa (Lucide, Font Awesome, etc)**
- **Dark mode:** Definido em globals.css mas DESATIVADO (body sempre bg-zinc-50)
- **Responsivo:** Mobile-first, breakpoints sm/md/lg/xl

## CORES (Classes Tailwind exatas)

### Marca Primária: EMERALD (verde)
| Elemento | Classe exata |
|---|---|
| Logo ícone quadrado | `bg-emerald-600 text-white` |
| Logo texto | `text-emerald-700` |
| Botão primário / CTA | `bg-emerald-600 text-white hover:bg-emerald-700` |
| Hero CTA | `bg-emerald-500 text-white hover:bg-emerald-400 hover:scale-105` |
| Preço | `text-emerald-700` |
| Links hover | `hover:text-emerald-700` |
| Badge verificado | `text-emerald-600` ou `bg-emerald-100 text-emerald-700` |
| Input focus | `focus:border-emerald-600 focus:ring focus:ring-emerald-600/20` |
| Botão outlined | `border border-emerald-600 text-emerald-700 hover:bg-emerald-50` |
| Paginação ativa | `bg-emerald-600 text-white border-emerald-600` |
| Chat bolha (minha) | `bg-emerald-600 text-white` |
| Indicador ligado | `text-emerald-600` |
| Avatar circles | `bg-emerald-600 text-white` |
| Stats band | `bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800` |

### Neutro: ZINC
| Elemento | Classe |
|---|---|
| Body fundo | `bg-zinc-50` |
| Cards fundo | `bg-white` |
| Bordas padrão | `border-zinc-200` |
| Bordas inputs | `border-zinc-300` |
| Títulos principais | `text-zinc-900` |
| Texto corpo | `text-zinc-600` ou `text-zinc-700` |
| Texto metadata | `text-zinc-500` |
| Texto muted | `text-zinc-400` |
| Fundo metadata section | `bg-zinc-50` |
| Hamburger hover | `hover:bg-zinc-100 text-zinc-600` |
| Search input bg | `bg-zinc-50 focus:bg-white` |
| Separador | `border-zinc-200` |

### Admin: PURPLE
| Elemento | Classe |
|---|---|
| Sidebar border | `border-purple-200` |
| Sidebar título | `text-purple-800` |
| Nav links hover | `hover:bg-purple-50 hover:text-purple-800` |
| Link admin no nav | `text-purple-700 hover:bg-purple-50` |

### Destaque: AMBER
| Elemento | Classe |
|---|---|
| Badge "⭐ Destaque" card | `bg-amber-400 text-amber-950` |
| Badge "⭐ Destaque" detail | `bg-amber-100 text-amber-800` |
| Estrelas rating | `text-amber-500` (★★★★★) |
| Estrela plano premium | `text-amber-500` (★) |

### Alerta/Erro
| Elemento | Classe |
|---|---|
| Texto erro | `text-red-600` |
| Badge estado REJEITADO | `bg-red-100 text-red-700` |
| Badge estado ANALISADO | `bg-blue-100 text-blue-700` |
| Badge estado PENDENTE | `bg-amber-100 text-amber-700` |
| Indicador reconectando | `text-amber-600` |
| Badge não-lidas | `bg-red-500 text-white` (NotificationBell) |
| Banner email não verificado | `bg-amber-50 text-amber-800` |

### Outros badges de estado (anúncio detail)
| Badge | Classe |
|---|---|
| Categoria | `bg-emerald-100 text-emerald-800` |
| Tipo negócio | `bg-zinc-100 text-zinc-700` |
| Reservado | `bg-blue-100 text-blue-800` |
| Destaque | `bg-amber-100 text-amber-800` |

---

## TIPOGRAFIA

### Fontes
- **Principal:** Geist Sans (variable `--font-geist-sans`, next/font/google)
- **Mono fallback:** Geist_Mono (variable `--font-geist-mono`)
- **Body CSS fallback:** `font-family: Arial, Helvetica, sans-serif`
- **HTML:** `lang="pt-AO"` + `antialiased`
- **Body:** `font-sans`

### Tamanhos por contexto
| Contexto | Classe |
|---|---|
| Título de secção home | `text-2xl font-bold text-zinc-900` |
| Título página estática | `text-3xl font-bold text-zinc-900` |
| Título anúncio detail | `text-2xl font-bold sm:text-3xl text-zinc-900` |
| Título card | `text-base font-semibold text-zinc-900` |
| Subtítulo / label | `text-sm font-medium text-zinc-700` |
| Preço card | `text-lg font-bold text-emerald-700` |
| Preço detail | `text-3xl font-bold text-emerald-700` |
| Small / metadata | `text-xs text-zinc-500` ou `text-zinc-400` |
| Timestamp chat | `text-[10px]` |
| Pill badge hero | `text-xs font-semibold uppercase tracking-wider` |
| Body description | `text-sm leading-6 text-zinc-600` ou `leading-7 text-zinc-700` |
| FAQ answer | `text-sm leading-6 text-zinc-600` |
| Stats number | `text-3xl font-extrabold sm:text-4xl` |

---

## LAYOUT CONTAINER
- **Container global:** `mx-auto max-w-6xl px-4` (= 1152px max)
- **Container estreito (estáticas):** `mx-auto max-w-3xl px-4`
- **Container login:** `mx-auto max-w-md px-4`
- **Body:** `flex min-h-full flex-col bg-zinc-50 font-sans`
- **Main:** `flex-1` (empurra footer)
- **Footer:** `mt-16`

---

## NAVBAR (Detalhes Exatos)
```
<header sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/95 backdrop-blur>
  <div mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4>
```
- **Logo:** `flex shrink-0 items-center gap-2 text-xl font-bold text-emerald-700`
  - Ícone: `flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white` (SVG cross 20x20)
- **Search (desktop):** `hidden flex-1 items-center lg:flex`, `max-w-md`
  - Container input: `relative w-full`
  - Input: `w-full rounded-full border border-zinc-300 bg-zinc-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-emerald-600 focus:bg-white`
  - Lupa SVG: `absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400` (16x16)
- **Nav links (desktop):** `hidden items-center gap-0.5 xl:flex`
  - Link: `rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900`
- **Ações direita (desktop):** `hidden shrink-0 items-center gap-2 md:flex`
  - Admin: `rounded-lg px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50`
  - Nome: `rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900`
  - Publicar: `rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700`
  - Registar (outline): `rounded-lg border border-emerald-600 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50`
- **Hamburger:** `md:hidden rounded-lg p-2 text-zinc-600 hover:bg-zinc-100` (SVG 24x24)
- **Menu mobile:** `border-t border-zinc-200 bg-white px-4 py-3 md:hidden`
  - Pesquisa mobile: `w-full rounded-full border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm`
  - Nav grid: `grid grid-cols-2 gap-1 sm:grid-cols-3`
  - Links: `rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100`
  - Botões: mesmas classes desktop empilhados

---

## FOOTER
```
<footer mt-16 border-t border-zinc-200 bg-zinc-50>
  <div mx-auto max-w-6xl px-4 py-12>
    <div grid gap-8 sm:grid-cols-2 lg:grid-cols-5>
```
- **Título marca:** `text-lg font-bold text-emerald-700`
- **Descrição:** `mt-3 text-sm leading-6 text-zinc-600`
- **Ícones sociais:** `flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white hover:border-emerald-500` (emojis: 💬📘📸💼)
- **Títulos colunas:** `text-sm font-semibold text-zinc-900`
- **Links colunas:** `mt-3 space-y-2 text-sm text-zinc-600 hover:text-emerald-700`
- **Copyright:** `mt-10 border-t border-zinc-200 pt-6 text-center text-xs text-zinc-500`

---

## HERO BANNER (Slides)
```
<section relative h-[300px] overflow-hidden sm:h-[420px] lg:h-[500px]>
```
- **3 slides:** carro (photo-1494976388531), casa (photo-1568605114967), terreno (photo-1500382017468)
- **Auto-rotate:** 6 segundos
- **Transição:** `transition-opacity duration-700`
- **Imagens:** next/image `fill` `object-cover` `sizes="100vw"`
- **Gradiente overlay:** `bg-gradient-to-r from-zinc-950/80 via-zinc-900/55 to-zinc-900/25`
- **Conteúdo:** `relative mx-auto flex h-full max-w-6xl flex-col items-center justify-center text-center text-white sm:items-start sm:text-left px-4`
- **Pill badge:** `rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider backdrop-blur`
  - Texto: "O marketplace de Angola"
- **H1:** `mt-4 max-w-2xl text-2xl font-extrabold leading-tight drop-shadow-lg sm:text-4xl lg:text-5xl`
- **Descrição:** `mt-2 max-w-xl text-sm text-white/90 drop-shadow sm:mt-3 sm:text-lg`
- **CTA:** `mt-5 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white shadow-xl hover:scale-105 hover:bg-emerald-400 sm:mt-7 sm:px-8 sm:py-3.5 sm:text-base`
- **Dots:** `absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10 sm:bottom-5`
  - Ativo: `h-2 w-8 rounded-full bg-white`
  - Inativo: `h-2 w-2 rounded-full bg-white/50 hover:bg-white/80`

---

## SMART SEARCH (Barra pesquisadora flutuante)
```
<section relative z-10 mx-auto -mt-16 max-w-6xl px-4>
  <form rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl>
```
- **Título:** `text-lg font-bold text-zinc-900` ("O que procura?")
- **Grid principal:** `mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4`
- **Input pesquisa:** `rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-600 lg:col-span-2`
- **Selects:** `rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-600`
- **Campos extras (atributos):** `mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4`, mesmos estilos input/select
- **Linha inferior:** `mt-3 grid items-center gap-3 sm:grid-cols-2 lg:grid-cols-5`
  - Província select
  - Preços: 2 inputs lado a lado `flex gap-2 lg:col-span-2`
  - Botão: `rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700` (com SVG lupa 16x16 + "Pesquisar")

---

## GRID CATEGORIAS (Home)
```
<section mx-auto max-w-6xl px-4 pt-14>
  <div grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4>
```
- **Título secção:** `text-2xl font-bold text-zinc-900`
- **Link "Ver todos":** `text-sm font-medium text-emerald-700 hover:underline`
- **Card categoria:** `group relative h-32 overflow-hidden rounded-xl shadow-sm hover:-translate-y-1 hover:shadow-lg sm:h-40`
- **Imagem:** `<img>` (plain) `absolute inset-0 h-full w-full object-cover group-hover:scale-110 transition-transform duration-300`
- **Gradiente:** `absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/35 to-transparent`
- **Conteúdo:** `relative flex h-full flex-col justify-between p-3 text-white sm:p-4`
- **Emoji:** `text-xl drop-shadow sm:text-2xl`
- **Contagem:** `rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold backdrop-blur sm:px-2.5 sm:text-xs`
- **Título curto:** `text-sm font-bold drop-shadow sm:text-base`
- **Descrição:** `line-clamp-1 text-[11px] text-white/75 sm:text-xs`

---

## LISTING CARD
```
<div group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md>
```
- **Imagem:** `relative aspect-[4/3] w-full overflow-hidden bg-zinc-100`
  - next/image: `fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" object-cover group-hover:scale-105 transition-transform duration-300`
- **Badge destaque:** `absolute left-3 top-3 z-10 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-semibold text-amber-950 shadow-sm`
- **Área texto:** `flex-1 flex-col gap-1 p-4`
  - Título: `line-clamp-1 text-base font-semibold text-zinc-900 group-hover:text-emerald-700`
  - Preço: `text-lg font-bold text-emerald-700`
  - Verificado: `text-xs font-medium text-emerald-600` ("✔ Verificado")
  - Subcategoria: `text-xs text-zinc-500` (com emoji categoria)
  - Localização: SVG pin 14px + `text-xs text-zinc-500`
  - Meta: `flex items-center justify-between text-xs text-zinc-400` (timeAgo + 👁 views)
  - Dono: `text-xs text-zinc-500` → "Por " + nome `font-medium text-zinc-700`
- **CTA inferior:** `border-t border-zinc-100 p-3`
  - Botão: `block w-full rounded-lg border border-emerald-600 px-4 py-2 text-center text-sm font-semibold text-emerald-700 hover:bg-emerald-50`

---

## ANÚNCIO DETAIL (/anuncio/[id])
```
<div mx-auto max-w-6xl px-4 py-8>
  <div grid gap-8 lg:grid-cols-5>
```
- **Breadcrumb:** `mb-4 text-sm text-zinc-500` → links `hover:text-emerald-700`, separador `mx-2` "›"
- **Galeria (col 3):** `lg:col-span-3`
  - Gallery: `overflow-hidden rounded-xl border border-zinc-200 bg-white`
  - Imagem principal: `relative aspect-[4/3] w-full` next/image fill object-cover
  - Thumbnails: `grid grid-cols-5 gap-1 border-t border-zinc-200 p-1 sm:grid-cols-8`
    - Thumb: `aspect-[4/3] w-full overflow-hidden rounded-lg`
    - Ativo: `ring-2 ring-emerald-600`
    - Inativo: `opacity-70 hover:opacity-100`
- **Info card:** `mt-6 rounded-xl border border-zinc-200 bg-white p-6`
  - Badges: `flex flex-wrap items-center gap-2` → `rounded-full px-3 py-1 text-xs font-semibold` (cores por badge acima)
  - Título: `mt-3 text-2xl font-bold text-zinc-900 sm:text-3xl`
  - Metadata grid: `mt-4 grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg bg-zinc-50 p-4 text-sm sm:grid-cols-3`
    - Label: `text-zinc-500`
    - Valor: `font-medium text-zinc-900`
  - Descrição título: `mt-6 text-lg font-semibold text-zinc-900`
  - Descrição: `mt-2 whitespace-pre-line leading-7 text-zinc-700`
- **Características:** `mt-6 rounded-xl border border-zinc-200 bg-white p-6`
  - Título: `text-lg font-semibold text-zinc-900`
  - Grid: `mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2`
  - Item: `flex justify-between gap-4 border-b border-zinc-100 pb-2`
    - Chave: `capitalize text-sm text-zinc-500`
    - Valor: `text-sm font-medium text-zinc-900`
- **Sidebar (col 2):** `lg:col-span-2`, `sticky top-20 space-y-4`
  - Card preço: `rounded-xl border border-zinc-200 bg-white p-6 shadow-sm`
    - Preço: `text-3xl font-bold text-emerald-700`
    - Subtexto: `mt-1 text-sm text-zinc-500`
    - Botões: `mt-4 flex flex-col gap-2`
    - WhatsApp: `flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-white px-5 py-3 text-base font-semibold text-emerald-700 hover:bg-emerald-50`
    - Reserva widget: `mt-4 border-t border-zinc-100 pt-4` (só ALUGUER)
  - Card vendedor: `rounded-xl border border-zinc-200 bg-white p-6`
    - Avatar: `flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-600 text-lg font-bold text-white`
    - Badge verificado: `ml-1.5 inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700` ("✔ VERIFICADO")
    - Rating: `text-xs text-amber-500` ("★ 4.5 (12)")
    - Lista info: `mt-4 space-y-1.5 border-t border-zinc-100 pt-4 text-sm text-zinc-600`
    - Denúncia link: `mt-4 border-t border-zinc-100 pt-3 text-right`
- **Avaliações:** componente ReviewSection

---

## PÁGINA LISTAR (/listar)
```
<div mx-auto max-w-6xl px-4 py-8>
```
- **Título:** `text-2xl font-bold text-zinc-900`
- **Contagem:** `mt-1 text-sm text-zinc-500`
- **Filtros:** ListingFilters componente
- **Grid resultados:** `mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3`
- **Empty state:** `mt-8 rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center`
  - Título: `text-lg font-medium text-zinc-700`
  - Subtítulo: `mt-2 text-sm text-zinc-500`

---

## LOGIN / REGISTAR (Mesmo layout)
```
<div mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12>
  <div rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm>
```
- **Título:** `text-2xl font-bold text-zinc-900`
- **Subtítulo:** `mt-2 text-sm text-zinc-500`
- **Form:** `mt-6 space-y-4`
- **Label:** `block text-sm font-medium text-zinc-700`
- **Input:** `mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600`
  - Select: mesma classe
  - Helper text: `mt-1 text-xs text-zinc-400`
- **Erro:** `text-sm text-red-600`
- **Botão submit:** `w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60`
- **Link alternativo:** `mt-6 text-center text-sm text-zinc-500` → link `font-medium text-emerald-700 hover:underline`

---

## CONTA LAYOUT (/conta/*)
```
<div mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row>
```
- **Aside:** `w-full shrink-0 md:w-56`
  - Card: `rounded-xl border border-zinc-200 bg-white p-4`
  - Header user: `flex items-center gap-3 border-b border-zinc-100 pb-4`
    - Avatar: `flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white` (inicial)
    - Nome: `truncate text-sm font-semibold text-zinc-900` + estrela premium `text-xs text-amber-500`
    - Email: `truncate text-xs text-zinc-500`
  - Banner email não verificado: `mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800`
    - Título: `font-semibold`
    - Texto: `mt-1 leading-5`
  - Nav: `mt-3 flex flex-col gap-1`
    - Links: `rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900`

---

## ADMIN LAYOUT (/admin/*)
```
<div mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row>
```
- **Aside:** `w-full shrink-0 md:w-56`
  - Card: `rounded-xl border border-purple-200 bg-white p-4`
  - Título: `text-sm font-bold text-purple-800`
  - Subtítulo: `mt-0.5 text-xs text-zinc-500` (nome)
  - Nav: `mt-3 flex flex-col gap-1`
    - Links: `rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-purple-50 hover:text-purple-800`
    - "Voltar": `text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600`

---

## CHAT (/mensagens)
```
<div flex-1 h-[calc(100vh-4rem)] flex-col lg:flex-row>
```
- **Sidebar conversas:** `w-full lg:w-80 shrink-0 border-r border-zinc-200 bg-white overflow-y-auto`
  - Header: `border-b border-zinc-200 p-4`
  - Conversa item: `flex items-center gap-3 p-3 hover:bg-zinc-50 cursor-pointer border-b border-zinc-100`
  - Conversa ativa: `bg-zinc-50 ring-2 ring-inset ring-emerald-600`
  - Avatar: `h-10 w-10 shrink-0 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold text-white`
  - Badge não-lidas: `ml-auto rounded-full bg-emerald-600 px-1.5 py-0.5 text-[11px] font-bold text-white`
- **Container mensagens:** `flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-zinc-50/50`
  - Empty state: `flex-1 flex items-center justify-center text-center`
    - Ícone: `text-4xl mb-2`
    - Título: `text-sm font-semibold text-zinc-700`
    - Sub: `text-xs text-zinc-500 mt-1`
- **Bolhas:** `max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm`
  - Minha (right): `justify-end` → `bg-emerald-600 text-white`
  - Outro (left): `justify-start` → `bg-zinc-100 text-zinc-900`
  - Nome remetente: `mb-0.5 text-[11px] font-semibold text-emerald-700`
  - Timestamp: `mt-1 text-[10px] text-emerald-100` (minha) / `text-zinc-400` (outro)
- **Header conversa ativa:** `border-b border-zinc-200 bg-white px-6 py-3`
  - Título: `truncate text-sm font-semibold text-zinc-900`
  - Info: `truncate text-xs text-zinc-500` + indicador ligação
- **Input bar:** `flex items-center gap-2 border-t border-zinc-200 bg-white p-3`
  - Input: `flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-600`
  - Botão enviar: `rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50`

---

## VENDEDOR (/vendedor/[id])
```
<div mx-auto max-w-6xl px-4 py-8>
  <div rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8>
```
- **Avatar:** `flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-600 text-3xl font-bold text-white`
- **Nome:** `text-2xl font-bold text-zinc-900` + badge `✔ VERIFICADO` `ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700`
- **Info:** `mt-1 text-sm text-zinc-500` (empresa/vendedor · província · tempo)
- **Rating:** `mt-1 text-sm font-medium text-amber-500`
- **Bio:** `mt-3 max-w-xl text-sm leading-6 text-zinc-600`
- **Grid anúncios:** `mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4`
- **Empty:** `mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500`
- **Avaliações:** `mt-10` → `mt-4 space-y-3` → `rounded-xl border border-zinc-200 bg-white p-4`

---

## EMPRESAS (/empresas)
```
<div mx-auto max-w-6xl px-4 py-10>
```
- **Título:** `text-3xl font-bold text-zinc-900`
- **Sub:** `mt-2 max-w-2xl text-sm text-zinc-600`
- **Tags tipo:** `mt-6 flex flex-wrap gap-2` → `rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-semibold text-zinc-600`
- **Grid:** `mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3`
- **Card empresa:** `flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-md`
  - Avatar: `flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-50 text-lg font-bold text-emerald-700`
  - Nome: `truncate font-semibold text-zinc-900` + ✔ `ml-1.5 text-emerald-600`
  - Info: `text-xs text-zinc-500`
  - Tempo: `text-xs text-zinc-400`

---

## PÁGINAS ESTÁTICAS (/ajuda /termos /privacidade /contacto)
```
<div mx-auto max-w-3xl px-4 py-10>
```
- **Título:** `text-3xl font-bold text-zinc-900`
- **Sub:** `mt-2 text-sm text-zinc-600`
- **FAQ (ajuda):** `mt-8 space-y-4`
  - Item: `rounded-xl border border-zinc-200 bg-white p-5 open:shadow-sm` (`<details>`)
  - Pergunta: `cursor-pointer font-semibold text-zinc-900` (`<summary>`)
  - Resposta: `mt-3 text-sm leading-6 text-zinc-600`
- **Termos/Privacidade:**
  - Seções: `mt-6 space-y-5 text-sm leading-7 text-zinc-600`
  - Subtítulos: `text-base font-semibold text-zinc-900`

---

## STATS BAND (Home, fundo final)
```
<section mx-auto max-w-6xl px-4 pb-16>
  <div rounded-2xl bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 px-6 py-10 shadow-lg>
    <div grid gap-8 text-center text-white sm:grid-cols-2 lg:grid-cols-4>
```
- **Número:** `text-3xl font-extrabold sm:text-4xl`
- **Label:** `mt-1 text-sm text-emerald-100`

---

## EMPRESAS NA HOME (seção)
```
<section bg-white py-12>
  <div mx-auto max-w-6xl px-4>
```
- **Grid empresas:** `mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3`
- **Card:** `flex items-center gap-4 rounded-xl border border-zinc-200 p-4 transition-shadow hover:shadow-md`
  - Avatar: `flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-50 text-lg font-bold text-emerald-700`
- **Vazio (5 tipos):** `mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5`
  - Card tipo: `rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-5 text-center`
    - Nome: `font-semibold text-zinc-700`
    - Link: `mt-1 block text-xs font-medium text-emerald-700 hover:underline`

---

## BOTÕES (Padrões Recorrentes)
| Tipo | Classe |
|---|---|
| Primário (filled) | `rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700` |
| Primário grande | `rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60` |
| Outlined | `rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50` |
| Ghost/link | `rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900` |
| Small inline | `text-sm font-medium text-emerald-700 hover:underline` |
| Danger outline | `border border-red-300 text-red-600 hover:bg-red-50` |

---

## INPUTS
| Tipo | Classe |
|---|---|
| Texto padrão | `w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600` |
| Texto register/login | `mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600` |
| Search navbar | `w-full rounded-full border border-zinc-300 bg-zinc-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-emerald-600 focus:bg-white` |
| Chat input | `flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-600` |
| Select | `mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600` |

---

## EMPTY STATES (Padrão)
```
rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center
  text-lg font-medium text-zinc-700   (título)
  mt-2 text-sm text-zinc-500          (descrição)
  mt-6 inline-block rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700  (CTA)
```

---

## RESPONSIVIDADE (Breakpoints)
| Breakpoint | Largura | Efeito |
|---|---|---|
| Base (mobile) | <640px | 1 coluna, hamburger, hero 300px, grid categorias 2 cols, categorias h-32 |
| `sm` | ≥640px | Grid 2-3 cols, hero 420px, categorias h-40, listing 2 cols |
| `md` | ≥768px | Navbar desktop ações visíveis, footer 2 cols, listing filters row, conta/admin flex-row, listing 2 cols |
| `lg` | ≥1024px | Categorias 4 cols, listing 3 cols, search bar desktop, sidebar filtros, footer 5 cols, hero 500px, categorias sm:grid-cols-8 thumbnails |
| `xl` | ≥1280px | Nav links todos visíveis, anúncio detail lg:grid-cols-5 |

---

## ANIMAÇÕES/HOVER
| Elemento | Animação |
|---|---|
| Cards listing | `hover:-translate-y-0.5 hover:shadow-md` + imagem `group-hover:scale-105 transition-transform duration-300` |
| Cards categorias | `hover:-translate-y-1 hover:shadow-lg` + imagem `group-hover:scale-110 transition-transform duration-300` |
| Hero CTA | `hover:scale-105` |
| Hero slides | `transition-opacity duration-700` |
| Links/botões | `transition-colors` |
| Cards empresas | `transition-shadow hover:shadow-md` |
| Navbar backdrop | `bg-white/95 backdrop-blur` |
| Thumbnails galeria | `ring-2 ring-emerald-600` (ativo) / `opacity-70 hover:opacity-100` |
| Gallery hover | (sem hover adicional, seleção por click) |

---

## HELPERS VISUAIS
- **formatKwanza(n):** `"AOA " + Intl.NumberFormat("pt-AO", {maximumFractionDigits:0}).format(n)` → "AOA 28.000.000"
- **timeAgo(date):** "agora mesmo" | "há X segundo(s)" | "há X minuto(s)" | "há X hora(s)" | "há X dia(s)" | "há X semana(s)" | "há muito tempo"
- **CATEGORY_ICONS[slug]:** emoji da categoria (🚗🏠🌍📱💻🪑👕💼🛠📦)
- **CATEGORY_IMAGES[slug]:** array URLs Unplash por categoria (fallback quando sem foto)
- **fallbackImage(categoria):** primeira imagem do array da categoria

---

## IMAGENS (URLs Exatas)
### Hero Slides
1. `https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1600&q=70` (carro vermelho)
2. `https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1600&q=70` (casa branca)
3. `https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=70` (terreno dourado)

### Formato URL Unsplash (next/image)
- Padrão: `?auto=format&fit=crop&w={width}&q=70`
- Hero: `w=1600&q=70`
- Listing card: `sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"`
- Galeria detail: `sizes="(max-width: 1024px) 100vw, 60vw"`

### Prisma Model Imagens
```prisma
model ListingImage {
  id        String  @id @default(cuid())
  url       String
  alt       String?
  order     Int     @default(0)
  listingId String
  listing   Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)
}
```
