/* Presente · perfil de presentes do Gabriel.
   Estado: PERFIL_PADRAO (perfil.js) < edição salva neste aparelho < link compartilhado (#p=...). */
(function () {
  'use strict'

  const $ = (s, r = document) => r.querySelector(s)
  const $$ = (s, r = document) => [...r.querySelectorAll(s)]
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
  const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const store = {
    get (k) { try { return localStorage.getItem(k) } catch (e) { return null } },
    set (k, v) { try { localStorage.setItem(k, v) } catch (e) {} },
    del (k) { try { localStorage.removeItem(k) } catch (e) {} }
  }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

  const CAT = Array.isArray(window.CATALOGO) ? window.CATALOGO : (typeof CATALOGO !== 'undefined' ? CATALOGO : [])
  const BY = new Map(CAT.map(p => [p.id, p]))
  const FAMILIAS = ['Cítrico', 'Fresco', 'Aromático', 'Floral', 'Frutado', 'Especiado', 'Amadeirado', 'Âmbar', 'Gourmand', 'Couro']
  const OCASIOES = ['Dia a dia', 'Trabalho', 'Noite', 'Encontro', 'Festa', 'Praia', 'Academia', 'Viagem']
  const TONS = [
    { id: 'grafite', nome: 'Grafite', cor: '#111111' },
    { id: 'marinho', nome: 'Marinho', cor: '#1f3a5f' },
    { id: 'herbal', nome: 'Herbal', cor: '#3b5a40' },
    { id: 'ambar', nome: 'Âmbar', cor: '#8a5a2b' },
    { id: 'rose', nome: 'Rosé', cor: '#8a4b55' }
  ]
  const ALL_NOTES = (() => {
    const m = new Map()
    CAT.forEach(p => [...p.t, ...p.h, ...p.s, ...p.x].forEach(n => { const k = fold(n); if (!m.has(k)) m.set(k, n) }))
    return [...m.values()].sort((a, b) => a.localeCompare(b, 'pt'))
  })()

  /* ---------- Estado ---------- */
  const LOCAL_KEY = 'presente-perfil'
  const clone = o => JSON.parse(JSON.stringify(o))
  function normalize (p) {
    const base = clone(PERFIL_PADRAO)
    const out = Object.assign(base, p || {})
    out.familias = out.familias && typeof out.familias === 'object' ? out.familias : {}
    ;['amo', 'evito', 'ocasioes', 'tenho'].forEach(k => { out[k] = Array.isArray(out[k]) ? out[k].filter(Boolean) : [] })
    out.desejos = (Array.isArray(out.desejos) ? out.desejos : []).filter(d => d && BY.has(d.id))
    out.tenho = out.tenho.filter(id => BY.has(id))
    out.nome = String(out.nome || 'Gabriel').slice(0, 24)
    out.bio = String(out.bio || '').slice(0, 180)
    return out
  }
  function encode (p) {
    const bytes = new TextEncoder().encode(JSON.stringify(p))
    let bin = ''; bytes.forEach(b => { bin += String.fromCharCode(b) })
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }
  function decode (s) {
    try {
      const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
      return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))))
    } catch (e) { return null }
  }

  let mode = 'view' // view | edit | shared
  let P
  function boot () {
    const h = location.hash
    if (h.startsWith('#p=')) {
      const d = decode(h.slice(3))
      if (d) { P = normalize(d); mode = 'shared'; return }
    }
    const saved = store.get(LOCAL_KEY)
    P = normalize(saved ? JSON.parse(saved) : null)
    if (h === '#editar') { mode = 'edit'; store.set('presente-dono', '1') } else mode = 'view'
  }
  const save = () => store.set(LOCAL_KEY, JSON.stringify(P))
  const isOwner = () => store.get('presente-dono') === '1'
  const shareURL = () => location.origin + location.pathname + '#p=' + encode(P)

  /* ---------- Gosto e sugestões ---------- */
  function notesOf (p) { return [...p.t, ...p.h, ...p.s, ...p.x] }
  function tasteFamilies () {
    const w = {}
    FAMILIAS.forEach(f => { w[f] = 0 })
    Object.entries(P.familias).forEach(([f, lv]) => { if (w[f] != null) w[f] += lv === 2 ? 3 : lv === 1 ? 1.5 : 0 })
    P.desejos.forEach((d, i) => { const p = BY.get(d.id); if (p && w[p.f] != null) w[p.f] += (d.top ? 2.2 : 1.4) * (1 - Math.min(i, 8) * 0.05) })
    P.tenho.forEach(id => { const p = BY.get(id); if (p && w[p.f] != null) w[p.f] += 0.6 })
    const total = Object.values(w).reduce((a, b) => a + b, 0)
    if (!total) return []
    return Object.entries(w).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([f, v]) => ({ f, pct: Math.round((v / total) * 100) }))
  }
  function audienceOk (p) {
    if (P.publico === 'Masculino') return p.a !== 'Feminino'
    if (P.publico === 'Feminino') return p.a !== 'Masculino'
    return true
  }
  function suggestions () {
    const taken = new Set([...P.desejos.map(d => d.id), ...P.tenho])
    const loved = P.amo.map(fold), avoid = P.evito.map(fold)
    const fams = tasteFamilies(), famW = Object.fromEntries(fams.map(x => [x.f, x.pct / 100]))
    const liked = Object.entries(P.familias).filter(([, v]) => v > 0).map(([f]) => f)
    const wishNotes = new Map()
    P.desejos.forEach(d => { const p = BY.get(d.id); if (p) notesOf(p).forEach(n => wishNotes.set(fold(n), (wishNotes.get(fold(n)) || 0) + 1)) })
    if (!loved.length && !fams.length && !wishNotes.size) return { seguras: [], ousadas: [] }
    const scored = []
    CAT.forEach(p => {
      if (taken.has(p.id) || !audienceOk(p)) return
      const ns = notesOf(p).map(fold)
      if (!ns.length) return
      let hate = 0; ns.forEach(n => { if (avoid.some(a => n.includes(a) || a.includes(n))) hate++ })
      if (hate) return
      let love = 0; ns.forEach(n => { if (loved.some(a => n.includes(a) || a.includes(n))) love++ })
      let sim = 0; ns.forEach(n => { sim += Math.min(wishNotes.get(n) || 0, 2) })
      sim = sim / Math.sqrt(ns.length + 2)
      const fam = famW[p.f] || 0
      const score = love * 1.2 + sim * 1.4 + fam * 3 + (p.img ? 0.2 : 0)
      if (score <= 0.6) return
      scored.push({ p, score, fam, love, sim, inLiked: liked.includes(p.f) || fam >= 0.2 })
    })
    scored.sort((a, b) => b.score - a.score)
    const brands = new Map()
    const pick = (list, n) => {
      const out = []
      for (const s of list) {
        const c = brands.get(s.p.b) || 0
        if (c >= 2) continue
        brands.set(s.p.b, c + 1); out.push(s)
        if (out.length >= n) break
      }
      return out
    }
    const seguras = pick(scored.filter(s => s.inLiked), 8)
    const ids = new Set(seguras.map(s => s.p.id))
    const ousadas = pick(scored.filter(s => !s.inLiked && !ids.has(s.p.id) && (s.love + s.sim) > 0.8), 6)
    return { seguras, ousadas }
  }
  function reason (s) {
    const loved = P.amo.filter(a => notesOf(s.p).some(n => fold(n).includes(fold(a)) || fold(a).includes(fold(n))))
    if (loved.length) return 'Tem ' + loved.slice(0, 2).join(' e ').toLowerCase() + ', que eu amo.'
    if (s.fam >= 0.2) return 'É ' + s.p.f.toLowerCase() + ', a família que mais uso.'
    return 'Parece com os perfumes da minha lista.'
  }

  /* ---------- Renderização ---------- */
  const IC = {
    up: '<svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 4l2.4 5 5.4.7-4 3.8 1 5.4L12 16.3 7.2 18.9l1-5.4-4-3.8 5.4-.7z"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    bag: '<svg viewBox="0 0 24 24"><path d="M6 8h12l-1 12H7zM9 8a3 3 0 0 1 6 0"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M12 15V4M8 8l4-4 4 4M6 13v6h12v-6"/></svg>'
  }
  function img (p, cls = '') {
    if (!p.img) return `<div class="ph">${esc(p.b.slice(0, 1))}</div>`
    return `<img class="${p.cv ? 'cover ' : ''}${cls}" src="${esc(p.img)}" alt="${esc(p.b + ' ' + p.n)}" loading="lazy" decoding="async" onload="this.classList.add('on')">`
  }
  function sub (p) { return [p.c, p.f].filter(Boolean).join(' · ') }
  function card (p, opts = {}) {
    const { rank, d, editing, idx, total, chosen } = opts
    const tag = chosen ? '<span class="tag got">Escolhido</span>' : d && d.top ? '<span class="tag">Mais quero</span>' : ''
    const tools = editing ? `<div class="card-tools">
        <button class="mini ${d.top ? 'on' : ''}" data-act="top" data-id="${p.id}" aria-label="Marcar como o que mais quero" aria-pressed="${!!d.top}">${IC.star}</button>
        <button class="mini" data-act="subir" data-id="${p.id}" aria-label="Subir" ${idx === 0 ? 'disabled style="opacity:.35"' : ''}>${IC.up}</button>
        <button class="mini" data-act="descer" data-id="${p.id}" aria-label="Descer" ${idx === total - 1 ? 'disabled style="opacity:.35"' : ''}>${IC.down}</button>
        <button class="mini" data-act="remover" data-id="${p.id}" aria-label="Remover">${IC.x}</button>
      </div>` : ''
    return `<div class="rv" style="--d:${Math.min(opts.i || 0, 8)}">
      <button class="card" data-act="ver" data-id="${p.id}">
        <div class="tile">${rank ? `<span class="rank">${String(rank).padStart(2, '0')}</span>` : ''}${tag}${img(p)}</div>
        <div class="meta"><div class="brand">${esc(p.b)}</div><div class="name">${esc(p.n)}</div><div class="sub">${esc(sub(p))}</div>${d && d.nota ? `<div class="why">${esc(d.nota)}</div>` : ''}</div>
      </button>${tools}</div>`
  }

  function render () {
    document.documentElement.dataset.tom = P.tom || 'grafite'
    document.body.classList.toggle('editing', mode === 'edit')
    $('#editbar').hidden = mode !== 'edit'
    $('#btn-editar').hidden = mode === 'edit' || !isOwner()
    document.title = P.nome + ' · Quero ganhar'
    const editing = mode === 'edit'
    const chosen = store.get('presente-escolhido-' + encode({ n: P.nome }))
    const fams = tasteFamilies()
    const wishes = P.desejos.map((d, i) => ({ d, p: BY.get(d.id), i })).filter(x => x.p)
    const top = wishes.find(x => x.d.top) || wishes[0]
    const letters = [...P.nome].map((c, i) => `<span class="ch" style="--i:${i}">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('')

    const hero = `<section class="hero">
      <div class="eyebrow rv in">Lista de presentes · perfumes</div>
      <h1 class="wordmark" aria-label="${esc(P.nome)}">${letters}</h1>
      <div class="hero-row">
        <p class="bio rv ${P.bio ? '' : 'muted'}" style="--d:2">${esc(P.bio || (editing ? 'Escreva uma frase sobre você em Perfil.' : ''))}</p>
        <div class="stats rv" style="--d:3">
          <div class="stat"><b>${wishes.length}</b><span>Quero ganhar</span></div>
          <div class="stat"><b class="word">${esc(fams[0] ? fams[0].f : '—')}</b><span>Família favorita</span></div>
          <div class="stat"><b>${esc((P.tamanho || '—').replace(' ml', ''))}${/ml/.test(P.tamanho) ? '<small>ml</small>' : ''}</b><span>Tamanho ideal</span></div>
        </div>
      </div>
    </section>`

    const list = wishes.length
      ? `<div class="grid">${wishes.map((x, i) => card(x.p, { rank: i + 1, d: x.d, editing, idx: i, total: wishes.length, i, chosen: chosen === x.p.id })).join('')}</div>`
      : `<div class="empty rv">${editing
          ? `<b>Comece pela sua lista</b><p>Adicione os perfumes que você quer ganhar. O primeiro é o que você mais quer.</p><button class="pill solid big" data-act="buscar" data-alvo="desejos">${IC.plus}Adicionar perfume</button>`
          : `<b>${esc(P.nome)} ainda está montando a lista</b><p>Enquanto isso, o gosto dele logo abaixo já ajuda a escolher.</p>`}</div>`

    const guide = wishes.length && !editing ? `<section class="sec">
      <div class="sec-head rv"><div><div class="eyebrow">Para quem vai presentear</div><h2 class="sec-title">Como acertar</h2></div></div>
      <div class="guide">
        <div class="step rv" style="--d:1"><em>01</em><b>Escolha da lista</b><p>${top ? `Se puder, o ${esc(top.p.n)}, da ${esc(top.p.b)}. Qualquer um da lista acerta.` : 'Qualquer um da lista acerta.'}</p></div>
        <div class="step rv" style="--d:2"><em>02</em><b>${esc(P.tamanho === 'Tanto faz' ? 'Qualquer tamanho' : 'Prefira ' + P.tamanho)}</b><p>${P.intensidade ? `Gosto de perfumes com intensidade ${esc(P.intensidade.toLowerCase())}.` : 'O tamanho que couber no orçamento.'}${P.ocasioes.length ? ' Uso mais em: ' + esc(P.ocasioes.join(', ').toLowerCase()) + '.' : ''}</p></div>
        <div class="step rv" style="--d:3"><em>03</em><b>Fuja de</b><p>${P.evito.length ? esc(P.evito.join(', ')) + '.' : 'Nada específico: confie na lista.'}${P.tenho.length ? ` Já tenho ${P.tenho.length} perfume${P.tenho.length > 1 ? 's' : ''}, listado${P.tenho.length > 1 ? 's' : ''} no fim da página.` : ''}</p></div>
      </div></section>` : ''

    const famHTML = fams.length
      ? `<div class="bars">${fams.map(x => `<div class="bar-row"><span>${esc(x.f)}</span><b>${x.pct}<small>%</small></b><div class="track"><i style="--w:${x.pct}%"></i></div></div>`).join('')}</div>`
      : `<p class="hint" style="margin-top:18px">${editing ? 'Marque suas famílias em Perfil, ou adicione perfumes à lista.' : 'Ainda sem dados.'}</p>`
    const facts = [['Para', P.publico], ['Intensidade', P.intensidade], ['Tamanho', P.tamanho], ['Uso em', P.ocasioes.join(', ')]].filter(x => x[1])
    const taste = `<section class="sec">
      <div class="sec-head rv"><div><div class="eyebrow">Meu gosto</div><h2 class="sec-title">O que me agrada</h2></div>${editing ? '<button class="pill ghost" data-act="perfil">Editar gosto</button>' : ''}</div>
      <div class="taste">
        <div class="panel rv" style="--d:1"><h3>Famílias olfativas</h3><p class="hint">Calculado pela lista e pelas famílias que marquei.</p>${famHTML}</div>
        <div class="panel rv" style="--d:2"><h3>Em resumo</h3>
          <div class="facts">${facts.map(f => `<div class="fact"><span>${esc(f[0])}</span><b>${esc(f[1])}</b></div>`).join('')}</div>
          ${P.amo.length ? `<div class="label">Notas que amo</div><div class="chips">${P.amo.map(n => `<span class="chip">${esc(n)}</span>`).join('')}</div>` : ''}
          ${P.evito.length ? `<div class="label">Evite</div><div class="chips">${P.evito.map(n => `<span class="chip no">${esc(n)}</span>`).join('')}</div>` : ''}
        </div>
      </div></section>`

    const sg = suggestions()
    const rail = (arr, label) => arr.length ? `<div class="label rv" style="margin:26px 0 12px">${label}</div><div class="rail">${arr.map((s, i) => `<div class="rv" style="--d:${Math.min(i, 6)}"><button class="card" data-act="ver" data-id="${s.p.id}"><div class="tile">${img(s.p)}</div><div class="meta"><div class="brand">${esc(s.p.b)}</div><div class="name">${esc(s.p.n)}</div><div class="why">${esc(reason(s))}</div></div></button>${editing ? `<div class="card-tools"><button class="mini" data-act="addwish" data-id="${s.p.id}">${IC.plus}&nbsp;Lista</button></div>` : ''}</div>`).join('')}</div>` : ''
    const sugg = (sg.seguras.length || sg.ousadas.length) ? `<section class="sec">
      <div class="sec-head rv"><div><div class="eyebrow">Não achou nenhum da lista?</div><h2 class="sec-title">Também acertam</h2><p class="sec-sub">Escolhidos pelo meu gosto: notas que amo, famílias que uso e o que já está na lista. Nada com o que eu evito.</p></div></div>
      ${rail(sg.seguras, 'Escolha segura')}${rail(sg.ousadas, 'Um pouco mais ousado')}</section>` : ''

    const owned = P.tenho.map(id => BY.get(id)).filter(Boolean)
    const have = (owned.length || editing) ? `<section class="sec">
      <div class="sec-head rv"><div><div class="eyebrow">Para não repetir</div><h2 class="sec-title">Já tenho<span class="count">${owned.length || ''}</span></h2></div>${editing ? '<button class="pill ghost" data-act="buscar" data-alvo="tenho">Adicionar</button>' : ''}</div>
      ${owned.length ? `<div class="rail">${owned.map((p, i) => `<div class="rv" style="--d:${Math.min(i, 6)}"><button class="card" data-act="ver" data-id="${p.id}"><div class="tile">${img(p)}</div><div class="meta"><div class="brand">${esc(p.b)}</div><div class="name">${esc(p.n)}</div></div></button>${editing ? `<div class="card-tools"><button class="mini" data-act="remtenho" data-id="${p.id}" aria-label="Remover">${IC.x}</button></div>` : ''}</div>`).join('')}</div>` : '<p class="sec-sub rv">Adicione os perfumes que você já tem, para ninguém dar repetido.</p>'}
    </section>` : ''

    $('#app').innerHTML = `${hero}
      <section class="sec" id="lista">
        <div class="sec-head rv"><div><div class="eyebrow">Em ordem de preferência</div><h2 class="sec-title">Quero ganhar<span class="count">${wishes.length || ''}</span></h2></div>${editing && wishes.length ? `<button class="pill ghost" data-act="buscar" data-alvo="desejos">${IC.plus}Adicionar</button>` : ''}</div>
        ${list}
      </section>${guide}${taste}${sugg}${have}
      <footer><span>${esc(P.nome)} · lista de presentes</span><span>Fotos de produto pertencem às marcas e lojas. Notas publicadas pelas marcas e pela base Scento (CC BY 4.0).</span><a href="https://gabrielkopi.github.io/elixir-perfumes/">Feito com ELIXIR</a></footer>`
    reveal()
  }

  /* ---------- Revelação com desfoque ---------- */
  let io
  function reveal () {
    const els = $$('.rv:not(.in)')
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return }
    io && io.disconnect()
    io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }), { rootMargin: '0px 0px -6% 0px', threshold: 0.01 })
    els.forEach(e => io.observe(e))
    // As seções do topo aparecem já no primeiro quadro
    requestAnimationFrame(() => els.forEach(e => { if (e.getBoundingClientRect().top < innerHeight) e.classList.add('in') }))
  }

  /* Troca suave com desfoque (View Transitions quando houver) */
  function transition (fn) {
    if (reduce || !document.startViewTransition) { fn(); return }
    try { document.startViewTransition(fn) } catch (e) { fn() }
  }

  /* ---------- Folha ---------- */
  const sheet = $('#sheet')
  let onClose = null
  function openSheet (html, after) {
    $('#sheet-body').innerHTML = html
    $$('#sheet-body > *').forEach((el, i) => el.style.setProperty('--d', Math.min(i, 8)))
    sheet.classList.remove('closing')
    $('.sheet-card').style.transform = ''
    if (!sheet.open) { sheet.showModal(); document.body.classList.add('sheet-open') }
    $('#sheet-body').scrollTop = 0
    after && after()
  }
  function closeSheet () {
    if (!sheet.open || sheet.classList.contains('closing')) return
    sheet.classList.add('closing')
    document.body.classList.remove('sheet-open')
    const done = () => { sheet.classList.remove('closing'); sheet.close(); $('.sheet-card').style.removeProperty('--drag'); const f = onClose; onClose = null; f && f() }
    reduce ? done() : setTimeout(done, 360)
  }
  sheet.addEventListener('cancel', e => { e.preventDefault(); closeSheet() })
  sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet() })
  // Arrastar para baixo fecha
  ;(function drag () {
    let y0 = null, dy = 0
    const card = $('.sheet-card')
    $('[data-grab]').addEventListener('pointerdown', e => { y0 = e.clientY; dy = 0; card.style.transition = 'none'; e.target.setPointerCapture(e.pointerId) })
    window.addEventListener('pointermove', e => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); card.style.transform = `translate(-50%, ${dy}px)` })
    window.addEventListener('pointerup', () => {
      if (y0 == null) return
      y0 = null; card.style.transition = ''
      if (dy > 110) { card.style.setProperty('--drag', dy + 'px'); closeSheet() } else card.style.transform = ''
    })
  })()

  /* ---------- Folhas de conteúdo ---------- */
  function perfumeSheet (id) {
    const p = BY.get(id); if (!p) return
    const d = P.desejos.find(x => x.id === id)
    const inList = !!d, owned = P.tenho.includes(id)
    const rows = [['Saída', p.t], ['Coração', p.h], ['Fundo', p.s], ['Destaques', p.x]].filter(r => r[1] && r[1].length)
    const q = encodeURIComponent([p.b, p.n, p.c].filter(Boolean).join(' '))
    const chosenKey = 'presente-escolhido-' + encode({ n: P.nome })
    const chosen = store.get(chosenKey) === id
    let actions
    if (mode === 'edit') {
      actions = `<div class="field"><span>Por que eu quero</span><textarea class="input" id="nota" rows="2" maxlength="120" placeholder="Ex.: uso no trabalho, é o meu cheiro favorito">${esc(d ? d.nota : '')}</textarea><div class="counter" id="nota-c"></div></div>
        <div class="actions two">
          ${inList ? `<button class="pill ghost big" data-act="toggletop" data-id="${id}">${d.top ? 'Tirar destaque' : 'Mais quero'}</button><button class="pill ghost big" data-act="remover" data-id="${id}" data-close="1">Tirar da lista</button>`
            : `<button class="pill solid big" data-act="addwish" data-id="${id}" data-close="1">${IC.plus}Quero ganhar</button><button class="pill ghost big" data-act="${owned ? 'remtenho' : 'addtenho'}" data-id="${id}" data-close="1">${owned ? 'Não tenho' : 'Já tenho'}</button>`}
        </div>`
    } else {
      actions = `<div class="actions">
          <a class="pill solid big wide" href="https://www.google.com/search?tbm=shop&q=${q}" target="_blank" rel="noopener">${IC.bag}Onde comprar</a>
          ${inList ? `<button class="pill ghost big wide" data-act="escolher" data-id="${id}">${chosen ? IC.check + 'Você escolheu este' : 'Vou dar este'}</button>` : ''}
        </div>`
    }
    openSheet(`
      <div class="eyebrow">${esc(p.b)}</div>
      <h2>${esc(p.n)}</h2>
      <p class="lead">${esc([p.c, p.a, p.f].filter(Boolean).join(' · '))}</p>
      <div class="ph-hero">${p.img ? `<img class="${p.cv ? 'cover' : ''}" src="${esc(p.img)}" alt="${esc(p.b + ' ' + p.n)}">` : `<div class="ph">${esc(p.b.slice(0, 1))}</div>`}</div>
      ${d && d.nota && mode !== 'edit' ? `<div class="note-box"><small>Por que eu quero</small>${esc(d.nota)}</div>` : ''}
      ${owned && mode !== 'edit' ? '<div class="note-box"><small>Atenção</small>Este eu já tenho.</div>' : ''}
      <div class="pyr">${rows.map(r => `<div class="pyr-row"><span>${r[0]}</span><div>${esc(r[1].join(', '))}</div></div>`).join('')}</div>
      ${actions}`, () => {
      const t = $('#nota')
      if (t) {
        const c = $('#nota-c'); const upd = () => { c.textContent = t.value.length + '/120' }; upd()
        t.addEventListener('input', () => { upd(); const w = P.desejos.find(x => x.id === id); if (w) { w.nota = t.value.trim(); save() } })
      }
    })
    onClose = () => { if (mode === 'edit') transition(render) }
  }

  let searchTarget = 'desejos'
  function searchSheet (alvo) {
    searchTarget = alvo
    openSheet(`
      <div class="eyebrow">${alvo === 'tenho' ? 'Já tenho' : 'Quero ganhar'}</div>
      <h2>Adicionar perfume</h2>
      <div class="search-wrap"><input class="input" id="q" type="search" placeholder="Nome, marca ou nota" autocomplete="off" enterkeyhint="search" aria-label="Buscar perfume"></div>
      <div class="results" id="res"></div>`, () => {
      const q = $('#q'); const res = $('#res')
      const run = () => {
        const v = fold(q.value.trim())
        const terms = v.split(/\s+/).filter(Boolean)
        let list = CAT
        if (terms.length) {
          list = CAT.map(p => {
            const hay = fold(p.b + ' ' + p.n + ' ' + p.c)
            const notes = fold(notesOf(p).join(' '))
            let s = 0
            for (const t of terms) { if (hay.includes(t)) s += fold(p.n).startsWith(t) ? 3 : 2; else if (notes.includes(t)) s += 1; else return null }
            return { p, s }
          }).filter(Boolean).sort((a, b) => b.s - a.s).map(x => x.p)
        } else list = CAT.filter(p => p.img).slice(0, 0)
        const set = new Set(alvo === 'tenho' ? P.tenho : P.desejos.map(d => d.id))
        res.innerHTML = list.slice(0, 40).map(p => `<button class="res" data-act="pick" data-id="${p.id}">
            <span class="thumb">${p.img ? `<img class="${p.cv ? 'cover' : ''}" src="${esc(p.img)}" alt="" loading="lazy">` : ''}</span>
            <span><div class="t1">${esc(p.n)}</div><div class="t2">${esc([p.b, p.c].filter(Boolean).join(' · '))}</div></span>
            <span class="add ${set.has(p.id) ? 'on' : ''}">${set.has(p.id) ? IC.check : IC.plus}</span></button>`).join('') ||
          (terms.length ? '<p class="sec-sub">Nada encontrado. Tente só a marca ou uma nota.</p>' : `<p class="sec-sub">${CAT.length} perfumes no catálogo. Digite para buscar.</p>`)
      }
      q.addEventListener('input', run); run()
      setTimeout(() => q.focus({ preventScroll: true }), reduce ? 0 : 320)
    })
    onClose = () => transition(render)
  }

  function profileSheet () {
    const seg = (key, opts) => `<div class="seg" role="group">${opts.map(o => `<button data-act="set" data-k="${key}" data-v="${esc(o)}" aria-pressed="${P[key] === o}">${esc(o)}</button>`).join('')}</div>`
    const famLv = f => P.familias[f] || 0
    openSheet(`
      <div class="eyebrow">Perfil</div>
      <h2>Do seu jeito</h2>
      <p class="lead">Tudo aqui segue o mesmo padrão visual. Você escolhe o conteúdo e o tom.</p>
      <label class="field"><span>Nome</span><input class="input" id="f-nome" maxlength="24" value="${esc(P.nome)}"></label>
      <label class="field"><span>Sobre você</span><textarea class="input" id="f-bio" rows="3" maxlength="180">${esc(P.bio)}</textarea><div class="counter" id="bio-c"></div></label>
      <div class="field"><span>Tom</span><div class="swatches">${TONS.map(t => `<div style="text-align:center"><button class="swatch" data-act="tom" data-v="${t.id}" aria-pressed="${P.tom === t.id}" aria-label="${t.nome}" style="background:${t.cor}"></button><div class="swatch-name">${t.nome}</div></div>`).join('')}</div></div>
      <div class="field"><span>Perfumes para</span>${seg('publico', ['Masculino', 'Feminino', 'Tanto faz'])}</div>
      <div class="field"><span>Tamanho ideal</span>${seg('tamanho', ['30 ml', '50 ml', '100 ml', 'Tanto faz'])}</div>
      <div class="field"><span>Intensidade</span>${seg('intensidade', ['Suave', 'Moderada', 'Marcante'])}</div>
      <div class="field"><span>Uso em</span><div class="chips">${OCASIOES.map(o => `<button class="chip" data-act="ocasiao" data-v="${esc(o)}" aria-pressed="${P.ocasioes.includes(o)}">${esc(o)}</button>`).join('')}</div></div>
      <div class="field"><span>Famílias · toque: gosto, amo, limpar</span><div class="chips">${FAMILIAS.map(f => `<button class="chip ${famLv(f) ? 'lv' + famLv(f) : ''}" data-act="familia" data-v="${esc(f)}">${esc(f)}${famLv(f) === 2 ? ' · amo' : famLv(f) === 1 ? ' · gosto' : ''}</button>`).join('')}</div></div>
      ${noteField('amo', 'Notas que amo', 'Ex.: baunilha, bergamota')}
      ${noteField('evito', 'Notas que evito', 'Ex.: patchouli')}
      <div class="actions"><button class="pill solid big wide" data-act="fechar">Pronto</button></div>
      <datalist id="notas">${ALL_NOTES.map(n => `<option value="${esc(n)}">`).join('')}</datalist>`, () => {
      const nome = $('#f-nome'), bio = $('#f-bio'), c = $('#bio-c')
      const upd = () => { c.textContent = bio.value.length + '/180' }; upd()
      nome.addEventListener('input', () => { P.nome = nome.value.trim() || 'Gabriel'; save() })
      bio.addEventListener('input', () => { upd(); P.bio = bio.value.trim(); save() })
      $$('[data-note-input]').forEach(inp => inp.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addNote(inp.dataset.noteInput, inp.value) }
      }))
      $$('[data-note-input]').forEach(inp => inp.addEventListener('change', () => { if (ALL_NOTES.includes(inp.value)) addNote(inp.dataset.noteInput, inp.value) }))
    })
    onClose = () => transition(render)
  }
  function noteField (k, label, ph) {
    return `<div class="field" id="nf-${k}"><span>${label}</span><input class="input" data-note-input="${k}" list="notas" placeholder="${ph}" autocomplete="off" enterkeyhint="done"><div class="chips">${P[k].map(n => `<button class="chip ${k === 'evito' ? 'no' : ''}" data-act="remnote" data-k="${k}" data-v="${esc(n)}">${esc(n)} <span class="x">×</span></button>`).join('')}</div></div>`
  }
  function addNote (k, v) {
    v = String(v || '').trim().replace(/,$/, '')
    if (!v || P[k].length >= 12 || P[k].some(n => fold(n) === fold(v))) return
    P[k].push(v.charAt(0).toUpperCase() + v.slice(1)); save()
    refreshNoteField(k)
  }
  function refreshNoteField (k) {
    const box = $('#nf-' + k); if (!box) return
    const tmp = document.createElement('div'); tmp.innerHTML = noteField(k, box.querySelector('span').textContent, box.querySelector('input').placeholder)
    box.querySelector('.chips').replaceWith(tmp.querySelector('.chips'))
    const inp = box.querySelector('input'); inp.value = ''; inp.focus()
  }

  /* ---------- Toast ---------- */
  let tt
  function toast (msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('on')
    clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2600)
  }

  /* ---------- Ações ---------- */
  function wishIndex (id) { return P.desejos.findIndex(d => d.id === id) }
  const A = {
    inicio (e) { e.preventDefault(); scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }) },
    tema () {
      const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      const next = cur === 'dark' ? 'light' : 'dark'
      transition(() => { document.documentElement.dataset.theme = next })
      store.set('presente-tema', next)
    },
    editar () { location.hash = '#editar' },
    sair () { history.replaceState(null, '', location.pathname); mode = 'view'; transition(render); toast('Salvo neste aparelho. Envie o link para quem vai presentear.') },
    perfil () { profileSheet() },
    buscar (e, el) { searchSheet(el.dataset.alvo || 'desejos') },
    fechar () { closeSheet() },
    ver (e, el) { perfumeSheet(el.dataset.id) },
    pick (e, el) {
      const id = el.dataset.id
      if (searchTarget === 'tenho') {
        const i = P.tenho.indexOf(id); i >= 0 ? P.tenho.splice(i, 1) : P.tenho.push(id)
        if (i < 0) { const w = wishIndex(id); if (w >= 0) P.desejos.splice(w, 1) }
      } else {
        const i = wishIndex(id)
        if (i >= 0) P.desejos.splice(i, 1)
        else { if (P.desejos.length >= 24) { toast('A lista aceita até 24 perfumes.'); return } P.desejos.push({ id, nota: '', top: false }); P.tenho = P.tenho.filter(x => x !== id) }
      }
      save()
      const on = searchTarget === 'tenho' ? P.tenho.includes(id) : wishIndex(id) >= 0
      const add = el.querySelector('.add'); add.classList.toggle('on', on); add.innerHTML = on ? IC.check : IC.plus
      if (on) toast(searchTarget === 'tenho' ? 'Marcado como já tenho' : 'Adicionado à lista')
    },
    addwish (e, el) {
      const id = el.dataset.id
      if (wishIndex(id) < 0) { P.desejos.push({ id, nota: '', top: false }); P.tenho = P.tenho.filter(x => x !== id); save(); toast('Adicionado à lista') }
      if (el.dataset.close) closeSheet(); else transition(render)
    },
    addtenho (e, el) { const id = el.dataset.id; if (!P.tenho.includes(id)) P.tenho.push(id); const w = wishIndex(id); if (w >= 0) P.desejos.splice(w, 1); save(); closeSheet() },
    remtenho (e, el) { P.tenho = P.tenho.filter(x => x !== el.dataset.id); save(); el.dataset.close ? closeSheet() : transition(render) },
    remover (e, el) { const i = wishIndex(el.dataset.id); if (i >= 0) P.desejos.splice(i, 1); save(); el.dataset.close ? closeSheet() : transition(render) },
    top (e, el) { const d = P.desejos[wishIndex(el.dataset.id)]; if (d) { d.top = !d.top; save(); transition(render) } },
    toggletop (e, el) { const d = P.desejos[wishIndex(el.dataset.id)]; if (d) { d.top = !d.top; save(); el.textContent = d.top ? 'Tirar destaque' : 'Mais quero' } },
    subir (e, el) { const i = wishIndex(el.dataset.id); if (i > 0) { const [d] = P.desejos.splice(i, 1); P.desejos.splice(i - 1, 0, d); save(); transition(render) } },
    descer (e, el) { const i = wishIndex(el.dataset.id); if (i >= 0 && i < P.desejos.length - 1) { const [d] = P.desejos.splice(i, 1); P.desejos.splice(i + 1, 0, d); save(); transition(render) } },
    escolher (e, el) {
      const key = 'presente-escolhido-' + encode({ n: P.nome }), id = el.dataset.id
      if (store.get(key) === id) { store.del(key); el.textContent = 'Vou dar este'; toast('Escolha desfeita') }
      else { store.set(key, id); el.innerHTML = IC.check + 'Você escolheu este'; toast(P.tamanho && P.tamanho !== 'Tanto faz' ? `Ótima escolha. Se puder, ${P.tamanho}.` : 'Ótima escolha.') }
      onClose = () => transition(render)
    },
    set (e, el) { P[el.dataset.k] = el.dataset.v; save(); $$(`[data-act=set][data-k=${el.dataset.k}]`).forEach(b => b.setAttribute('aria-pressed', b === el)) },
    tom (e, el) { P.tom = el.dataset.v; save(); document.documentElement.dataset.tom = P.tom; $$('[data-act=tom]').forEach(b => b.setAttribute('aria-pressed', b === el)) },
    ocasiao (e, el) { const v = el.dataset.v, i = P.ocasioes.indexOf(v); i >= 0 ? P.ocasioes.splice(i, 1) : P.ocasioes.push(v); save(); el.setAttribute('aria-pressed', i < 0) },
    familia (e, el) {
      const f = el.dataset.v, lv = ((P.familias[f] || 0) + 1) % 3
      if (lv) P.familias[f] = lv; else delete P.familias[f]
      save(); el.className = 'chip' + (lv ? ' lv' + lv : ''); el.textContent = f + (lv === 2 ? ' · amo' : lv === 1 ? ' · gosto' : '')
    },
    remnote (e, el) { const k = el.dataset.k; P[k] = P[k].filter(n => n !== el.dataset.v); save(); refreshNoteField(k) },
    async enviar () {
      const url = shareURL()
      const text = `Minha lista de perfumes para presente: ${url}`
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        try { await navigator.share({ title: P.nome + ' · Quero ganhar', text: 'Minha lista de perfumes para presente', url }); return } catch (err) { if (err && err.name === 'AbortError') return }
      }
      try { await navigator.clipboard.writeText(url); toast('Link copiado. É só colar na conversa.') }
      catch (err) {
        openSheet(`<div class="eyebrow">Enviar</div><h2>Seu link</h2><p class="lead">Copie e envie para quem vai presentear.</p><div class="field"><textarea class="input" rows="4" readonly onclick="this.select()">${esc(url)}</textarea></div>`)
        void text
      }
    }
  }
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]')
    if (!el || el.disabled) return
    const fn = A[el.dataset.act]
    if (!fn) return
    if (el.tagName === 'A' && el.dataset.act !== 'inicio') return
    fn(e, el)
  })

  /* Topo ganha vidro ao rolar */
  const top = $('#top')
  const onScroll = () => top.classList.toggle('solid', scrollY > 24)
  addEventListener('scroll', onScroll, { passive: true }); onScroll()

  addEventListener('hashchange', () => {
    if (sheet.open) { onClose = null; closeSheet() }
    boot(); transition(render); scrollTo({ top: 0 })
  })
  addEventListener('storage', e => { if (e.key === LOCAL_KEY && mode !== 'shared') { boot(); render() } })

  boot(); render()
})()
