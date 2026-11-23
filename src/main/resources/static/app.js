'use strict';

/* ==========================================================================
   Configuração
   ========================================================================== */
const DEFAULT_API = 'http://localhost:8080';

function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch { /* ignora */ } }

let API_BASE = (lsGet('apiBase') || DEFAULT_API).replace(/\/+$/, '');

/* ==========================================================================
   Utilidades
   (o helper de seletor se chama "qs" para não colidir com o "$" do jQuery)
   ========================================================================== */
const qs = (sel, root = document) => root.querySelector(sel);

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// LocalDate chega como "yyyy-MM-dd" (ou [a, m, d] se o Jackson estiver configurado assim)
function normDate(v) {
  if (!v) return '';
  if (Array.isArray(v)) return v.map((n, i) => String(n).padStart(i === 0 ? 4 : 2, '0')).join('-');
  return String(v).slice(0, 10);
}
const fmtDate = (v) => { const d = normDate(v); return d ? d.split('-').reverse().join('/') : '—'; };
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function toast(msg, type = 'ok') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  qs('#toasts').appendChild(el);
  setTimeout(() => el.remove(), type === 'err' ? 6500 : 3500);
}

/* ==========================================================================
   Validação e formatação (CPF, telefone, CEP, e-mail, data)
   ========================================================================== */
const onlyDigits = (s) => String(s ?? '').replace(/\D/g, '');

function cpfValido(cpf) {
  const d = onlyDigits(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false; // 111.111.111-11 etc.
  const dv = (len) => {
    let soma = 0;
    for (let i = 0; i < len; i++) soma += Number(d[i]) * (len + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

const emailValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

// dd/mm/aaaa -> "yyyy-MM-dd" (ou '' se a data não existir)
function brToIso(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s).trim());
  if (!m) return '';
  const [, dd, mm, yyyy] = m;
  const d = Number(dd), mo = Number(mm), y = Number(yyyy);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  const real = dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
  return real && y >= 1900 && y <= 2100 ? `${yyyy}-${mm}-${dd}` : '';
}
const isoToBr = (iso) => { const d = normDate(iso); return d ? d.split('-').reverse().join('/') : ''; };

// Formatam valores já salvos para exibir dentro dos campos mascarados
function fmtCpf(v) {
  const d = onlyDigits(v);
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : (v ?? '');
}
function fmtPhone(v) {
  const d = onlyDigits(v);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v ?? '';
}
const fmtCep = (v) => { const d = onlyDigits(v); return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : (v ?? ''); };

const FORMATTERS = { cpf: fmtCpf, phone: fmtPhone, cep: fmtCep, date: isoToBr };

// Cada validador devolve '' (ok) ou a mensagem de erro. Só roda em campo preenchido.
const VALIDATORS = {
  cpf: (v) => (cpfValido(v) ? '' : 'CPF inválido. Confira os números.'),
  phone: (v) => ([10, 11].includes(onlyDigits(v).length) ? '' : 'Telefone inválido. Use (DD) 99999-9999.'),
  cep: (v) => (onlyDigits(v).length === 8 ? '' : 'CEP inválido. Use 00000-000.'),
  email: (v) => (emailValido(v) ? '' : 'E-mail inválido. Use nome@exemplo.com.'),
  date: (v) => (brToIso(v) ? '' : 'Data inválida. Use dd/mm/aaaa.'),
};

/* Máscaras (jQuery Mask Plugin) */
const HAS_MASK = !!(window.jQuery && window.jQuery.fn && window.jQuery.fn.mask);

function applyMask(el) {
  if (!HAS_MASK || el.dataset.masked) return;
  const $el = window.jQuery(el);
  switch (el.dataset.mask) {
    case 'cpf': $el.mask('000.000.000-00', { reverse: true }); break;
    case 'date': $el.mask('00/00/0000'); break;
    case 'cep': $el.mask('00000-000'); break;
    case 'phone': {
      // 11 dígitos = celular (00000-0000); até 10 = fixo (0000-0000)
      const behavior = (v) => (v.replace(/\D/g, '').length > 10 ? '(00) 00000-0000' : '(00) 0000-00009');
      $el.mask(behavior, { onKeyPress: (v, e, field, opts) => field.mask(behavior(v), opts) });
      break;
    }
    default: return;
  }
  el.dataset.masked = '1';
}
const applyMasks = (root) => root.querySelectorAll('[data-mask]').forEach(applyMask);

function validateInput(el) {
  const type = el.dataset.v;
  if (!type || !VALIDATORS[type]) return;
  const v = el.value.trim();
  el.setCustomValidity(v ? VALIDATORS[type](v) : '');
}

/* ==========================================================================
   Cliente da API
   O back-end devolve JSON nos GETs e, em vários POST/PUT/DELETE, texto puro.
   ========================================================================== */
class ApiError extends Error {
  constructor(message, status = 0) { super(message); this.status = status; }
}

// Mensagens do servidor que chegam com HTTP 200 mas indicam falha
const FAIL_TEXT = /deu ruim|n[aã]o encontrad/i;

async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(`Não foi possível conectar à API em ${API_BASE}. Confira se o servidor está rodando e se o CORS está liberado.`, 0);
  }

  const text = await res.text();
  let data = text;
  try { data = JSON.parse(text); } catch { /* resposta em texto puro */ }

  if (!res.ok) throw new ApiError(typeof data === 'string' && data ? data : `Erro ${res.status} na API.`, res.status);

  if (typeof data === 'string' && FAIL_TEXT.test(data)) {
    const notFound = /n[aã]o encontrad/i.test(data);
    throw new ApiError(notFound ? data : 'O servidor não conseguiu salvar. Confira os dados e tente de novo.', 422);
  }
  return data;
}

/* ==========================================================================
   Estado
   ========================================================================== */
const state = { casas: [], cuidadores: [], alocacoes: [], errors: {} };
const byId = (key, id) => state[key].find((x) => x.id === id);
const refName = (key, ref) => (ref ? (ref.nome || byId(key, ref.id)?.nome || `#${ref.id}`) : '—');

function isActive(a) {
  const saida = normDate(a.dataSaida);
  return !saida || saida >= todayISO();
}

// Alocação ativa de um cuidador (ignorando, ao editar, a própria alocação)
function alocacaoAtivaDoCuidador(cuidadorId, ignorarId) {
  return state.alocacoes.find((a) => a.cuidador?.id === cuidadorId && a.id !== ignorarId && isActive(a));
}

/* Avatar: foto (data URL de imagem) ou iniciais */
const initials = (nome) => String(nome || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
function avatar(nome, foto, large = false, id = '') {
  const cls = `avatar${large ? ' lg' : ''}`;
  const idAttr = id ? ` id="${id}"` : '';
  if (foto && /^data:image\//.test(foto)) return `<img class="${cls}"${idAttr} src="${esc(foto)}" alt="">`;
  return `<span class="${cls}"${idAttr} aria-hidden="true">${esc(initials(nome))}</span>`;
}

/* Donos: derivados das casas (agrupa pelo nome do dono, ignorando acento/caixa) */
const normName = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

function groupDonos() {
  const map = new Map();
  state.casas.forEach((c) => {
    const nome = (c.dono || '').trim();
    const key = normName(nome);
    if (!map.has(key)) map.set(key, { nome, telefones: new Set(), emails: new Set(), casas: [] });
    const g = map.get(key);
    if (c.donoTelefone) g.telefones.add(c.donoTelefone);
    if (c.donoEmail) g.emails.add(c.donoEmail);
    g.casas.push(c);
  });
  return [...map.values()].sort((a, b) => {
    if (!a.nome !== !b.nome) return a.nome ? -1 : 1; // "sem dono" por último
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
}
const donosNomeados = () => groupDonos().filter((g) => g.nome);

/* ==========================================================================
   Definição das entidades (uma tabela de configuração gera telas e formulários)
   ========================================================================== */
const entities = {
  casas: {
    path: '/api/casas', title: 'Casas', description: 'Imóveis atendidos, seus donos e sócios.',
    newLabel: 'Nova casa', editLabel: 'Editar casa', noun: 'a casa', canEdit: true,
    emptyText: 'Nenhuma casa cadastrada.',
    inUseMsg: 'Esta casa tem alocações e não pode ser excluída. Remova-as primeiro.',
    columns: [
      { label: 'Nome', get: (i) => i.nome },
      {
        label: 'Endereço', get: (i) => [i.endereco, i.cep].filter(Boolean).join(' '),
        html: (i) => `${esc(i.endereco || '—')}${i.cep ? `<span class="sub">CEP ${esc(i.cep)}</span>` : ''}`,
      },
      {
        label: 'Dono', get: (i) => [i.dono, i.donoTelefone, i.donoEmail].filter(Boolean).join(' '),
        html: (i) => `${esc(i.dono || '—')}${[i.donoTelefone, i.donoEmail].filter(Boolean).map((x) => `<span class="sub">${esc(x)}</span>`).join('')}`,
      },
      {
        label: 'Sócios', get: (i) => (i.socios || []).map((s) => s.nome).join(', '),
        html: (i) => ((i.socios || []).length ? esc(i.socios.map((s) => s.nome).join(', ')) : '—'),
      },
      { label: 'Valor', get: (i) => brl.format(i.valor ?? 0), cls: 'num' },
    ],
    fields: [
      { name: 'nome', label: 'Nome da casa', type: 'text', required: true },
      { row: [
          { name: 'endereco', label: 'Endereço', type: 'text' },
          { name: 'cep', label: 'CEP', type: 'text', mask: 'cep', placeholder: '00000-000', inputmode: 'numeric' },
        ], cls: 'row-21' },
      { name: 'valor', label: 'Valor (R$)', type: 'number', step: '0.01', min: '0', number: true },
      { type: 'heading', label: 'Dono da casa' },
      { name: 'dono', label: 'Nome do dono', type: 'text' },
      { row: [
          { name: 'donoTelefone', label: 'Telefone do dono', type: 'tel', mask: 'phone', placeholder: '(11) 91234-5678', inputmode: 'tel' },
          { name: 'donoEmail', label: 'E-mail do dono', type: 'email', validate: 'email', placeholder: 'nome@exemplo.com' },
        ] },
      { type: 'socios', name: 'socios' },
    ],
    label: (i) => i.nome,
  },

  cuidadores: {
    path: '/api/cuidadores', title: 'Cuidadores', description: 'Profissionais disponíveis para alocação.',
    newLabel: 'Novo cuidador', editLabel: 'Editar cuidador', noun: 'o cuidador', canEdit: true,
    emptyText: 'Nenhum cuidador cadastrado.',
    inUseMsg: 'Este cuidador possui alocações e não pode ser excluído. Remova-as primeiro.',
    columns: [
      {
        label: 'Nome', get: (i) => i.nome,
        html: (i) => `<div class="person">${avatar(i.nome, i.foto)}<span>${esc(i.nome)}</span></div>`,
      },
      { label: 'Telefone', get: (i) => i.telefone || '—' },
      { label: 'CPF', get: (i) => i.cpf || '—' },
      {
        label: 'Disponibilidade',
        get: (i) => {
          if (state.errors.alocacoes) return '—';
          const a = alocacaoAtivaDoCuidador(i.id);
          return a ? `Indisponível (${refName('casas', a.casa)})` : 'Disponível';
        },
        html: (i) => {
          if (state.errors.alocacoes) return '—';
          const a = alocacaoAtivaDoCuidador(i.id);
          return a
              ? `<span class="badge warn">Indisponível</span><span class="sub">Alocado em ${esc(refName('casas', a.casa))}</span>`
              : '<span class="badge ok">Disponível</span>';
        },
      },
    ],
    fields: [
      { type: 'foto', name: 'foto', label: 'Foto (opcional)' },
      { name: 'nome', label: 'Nome', type: 'text', required: true },
      { name: 'telefone', label: 'Telefone', type: 'tel', mask: 'phone', placeholder: '(11) 91234-5678', inputmode: 'tel' },
      { name: 'cpf', label: 'CPF', type: 'text', mask: 'cpf', placeholder: '000.000.000-00', inputmode: 'numeric' },
    ],
    label: (i) => i.nome,
  },

  alocacoes: {
    path: '/api/alocacoes', title: 'Alocações', description: 'Quem cuida de qual casa, e por quanto tempo.',
    newLabel: 'Nova alocação', editLabel: 'Editar alocação', noun: 'a alocação', canEdit: true,
    emptyText: 'Nenhuma alocação registrada.',
    columns: [
      { label: 'Casa', get: (i) => refName('casas', i.casa) },
      { label: 'Cuidador', get: (i) => refName('cuidadores', i.cuidador) },
      { label: 'Entrada', get: (i) => fmtDate(i.dataEntrada) },
      { label: 'Saída', get: (i) => fmtDate(i.dataSaida) },
      {
        label: 'Situação', get: (i) => (isActive(i) ? 'Ativa' : 'Encerrada'),
        html: (i) => (isActive(i) ? '<span class="badge ok">Ativa</span>' : '<span class="badge muted">Encerrada</span>'),
      },
      { label: 'Observações', get: (i) => i.observacoes || '', cls: 'clip' },
    ],
    fields: [
      { name: 'casa', label: 'Casa', type: 'select', ref: 'casas', required: true, emptyHint: 'Cadastre uma casa antes de criar a alocação.' },
      {
        name: 'cuidador', label: 'Cuidador', type: 'select', ref: 'cuidadores', required: true,
        emptyHint: 'Cadastre um cuidador antes de criar a alocação.',
        optionDisabled: (o, item) => !!alocacaoAtivaDoCuidador(o.id, item?.id),
        disabledSuffix: ' — indisponível',
        allDisabledHint: 'Todos os cuidadores estão alocados no momento.',
      },
      { row: [
          { name: 'dataEntrada', label: 'Data de entrada', type: 'date', required: true },
          { name: 'dataSaida', label: 'Data de saída', type: 'date', hint: 'Deixe em branco se ainda está em andamento.' },
        ] },
      { name: 'observacoes', label: 'Observações', type: 'textarea' },
    ],
    conflictMsg: 'Este cuidador já está alocado em outra casa.',
    validate: (p, item) => {
      if (p.dataSaida && p.dataSaida < p.dataEntrada) return 'A data de saída não pode ser anterior à de entrada.';
      const ficaAtiva = !p.dataSaida || p.dataSaida >= todayISO();
      const ocupado = p.cuidador && ficaAtiva && alocacaoAtivaDoCuidador(p.cuidador.id, item?.id);
      if (ocupado) return `Este cuidador está indisponível: já está alocado em ${refName('casas', ocupado.casa)}. Encerre essa alocação (preenchendo a data de saída) antes de alocá-lo novamente.`;
      return null;
    },
    label: (i) => `${refName('cuidadores', i.cuidador)} em ${refName('casas', i.casa)}`,
  },
};

const NAV = [
  { key: 'inicio', label: 'Visão geral' },
  { key: 'casas', label: 'Casas' },
  { key: 'cuidadores', label: 'Cuidadores' },
  { key: 'alocacoes', label: 'Alocações' },
  { key: 'donos', label: 'Donos e sócios' },
];

/* ==========================================================================
   Carregamento de dados
   ========================================================================== */
let loaded = false;

async function loadAll() {
  const keys = Object.keys(entities);
  const results = await Promise.allSettled(keys.map((k) => api(entities[k].path)));
  results.forEach((r, i) => {
    const k = keys[i];
    if (r.status === 'fulfilled') {
      state[k] = Array.isArray(r.value) ? r.value : [];
      state.errors[k] = null;
    } else {
      state.errors[k] = r.reason;
    }
  });
  loaded = true;

  const offline = results.every((r) => r.status === 'rejected' && r.reason.status === 0);
  const partial = results.some((r) => r.status === 'rejected');
  const el = qs('#apiStatus');
  el.className = 'api-status ' + (offline ? 'off' : 'on');
  el.textContent = offline ? 'Sem conexão com a API' : partial ? 'Conectado, com erros' : 'Conectado';
}

async function refresh() {
  await loadAll();
  renderNav();
  route();
}

/* ==========================================================================
   Navegação
   ========================================================================== */
function currentKey() {
  const k = location.hash.replace(/^#\//, '');
  return NAV.some((n) => n.key === k) ? k : 'inicio';
}

function navCount(key) {
  if (key === 'inicio' || !loaded) return null;
  if (key === 'donos') return state.errors.casas ? null : donosNomeados().length;
  return state.errors[key] ? null : state[key].length;
}

function renderNav() {
  const cur = currentKey();
  qs('#nav').innerHTML = NAV.map((n) => {
    const c = navCount(n.key);
    const count = c === null ? '' : `<span class="count">${c}</span>`;
    return `<a href="#/${n.key}" ${n.key === cur ? 'aria-current="page"' : ''}>${esc(n.label)}${count}</a>`;
  }).join('');
}

function route() {
  const key = currentKey();
  renderNav();
  const view = qs('#view');
  document.title = `${NAV.find((n) => n.key === key).label} · Cuidadores`;

  if (!loaded) {
    view.innerHTML = '<div class="state-msg">Carregando…</div>';
    return;
  }
  if (key === 'inicio') renderDashboard(view);
  else if (key === 'donos') renderDonos(view);
  else renderEntity(view, key);
}

/* ==========================================================================
   Visão geral
   ========================================================================== */
function errorPanel(key) {
  const err = state.errors[key];
  let extra = '';
  if (err.status === 500 && key === 'alocacoes') {
    extra = ' Se o erro persistir, é provável que a serialização das relações LAZY esteja falhando no back-end.';
  }
  return `<div class="state-msg error"><strong>Não foi possível carregar ${esc(entities[key].title.toLowerCase())}</strong>${esc(err.message)}${extra}<br><button class="btn" data-retry>Tentar de novo</button></div>`;
}

function renderDashboard(view) {
  const ativas = state.alocacoes.filter(isActive);
  const casasComCuidador = new Set(ativas.map((a) => a.casa?.id));
  const semCuidador = state.casas.filter((c) => !casasComCuidador.has(c.id));
  const valorTotal = state.casas.reduce((s, c) => s + (c.valor || 0), 0);

  const stat = (key, label, n) => `<a class="stat" href="#/${key}"><span>${label}</span><b>${n}</b></a>`;

  view.innerHTML = `
    <div class="page-head"><div><h1>Visão geral</h1><p>Situação atual das casas e equipes.</p></div></div>

    <div class="stats">
      ${stat('casas', 'Casas', state.casas.length)}
      ${stat('cuidadores', 'Cuidadores', state.cuidadores.length)}
      ${stat('alocacoes', 'Alocações ativas', ativas.length)}
      ${stat('donos', 'Donos', state.errors.casas ? '—' : donosNomeados().length)}
    </div>

    <div class="two-col">
      <section class="panel">
        <div class="panel-head"><h2>Alocações em andamento</h2><span>${ativas.length}</span></div>
        ${state.errors.alocacoes ? errorPanel('alocacoes') : miniTable(
      ['Casa', 'Cuidador', 'Desde'],
      ativas.slice(0, 8).map((a) => [refName('casas', a.casa), refName('cuidadores', a.cuidador), fmtDate(a.dataEntrada)]),
      'Nenhuma alocação ativa no momento.')}
      </section>

      <section class="panel">
        <div class="panel-head"><h2>Casas sem cuidador</h2><span>${state.errors.casas || state.errors.alocacoes ? '' : semCuidador.length}</span></div>
        ${state.errors.casas ? errorPanel('casas') : state.errors.alocacoes ? '<div class="empty">Depende das alocações, que não carregaram.</div>' : miniTable(
      ['Casa', 'Dono'],
      semCuidador.slice(0, 8).map((c) => [c.nome, c.dono || '—']),
      state.casas.length ? 'Todas as casas têm cuidador alocado.' : 'Nenhuma casa cadastrada.')}
      </section>
    </div>

    ${state.errors.casas ? '' : `<p style="color:var(--muted);margin-top:20px">Valor somado das casas: <strong style="color:var(--ink)">${brl.format(valorTotal)}</strong></p>`}
  `;
}

function miniTable(heads, rows, emptyText) {
  if (!rows.length) return `<div class="empty">${esc(emptyText)}</div>`;
  return `<div class="table-wrap"><table>
    <thead><tr>${heads.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

/* ==========================================================================
   Donos e sócios
   ========================================================================== */
function renderDonos(view) {
  view.innerHTML = `
    <div class="page-head">
      <div><h1>Donos e sócios</h1><p>Quem é dono de cada casa e quem são os sócios. Para alterar, edite a casa.</p></div>
      <button class="btn primary" data-new>Nova casa</button>
    </div>
    ${state.errors.casas ? `<section class="panel">${errorPanel('casas')}</section>` : `
      <div class="toolbar panel" style="margin-bottom:16px;border-bottom:1px solid var(--line)"><input type="search" id="search" placeholder="Buscar por dono, casa ou sócio…" aria-label="Buscar" value="${esc(searchTerm.donos || '')}"></div>
      <div class="donos" id="donosList"></div>`}`;
  if (!state.errors.casas) renderDonosList();
}

function socioChip(s) {
  const contato = [s.telefone, s.email].filter(Boolean).map(esc).join(' · ');
  return `<span class="chip">${esc(s.nome)}${contato ? `<small>${contato}</small>` : ''}</span>`;
}

function renderDonosList() {
  const q = normName(searchTerm.donos || '');
  const grupos = groupDonos().filter((g) => !q || normName([
    g.nome, ...g.casas.map((c) => c.nome), ...g.casas.flatMap((c) => (c.socios || []).map((s) => s.nome)),
  ].join(' ')).includes(q));
  const box = qs('#donosList');

  if (!grupos.length) {
    box.innerHTML = q
        ? `<div class="empty panel"><strong>Nada encontrado</strong>Nenhum resultado para “${esc(searchTerm.donos)}”.</div>`
        : '<div class="empty panel"><strong>Nenhum dono cadastrado.</strong>Informe o dono ao cadastrar uma casa.</div>';
    return;
  }

  box.innerHTML = grupos.map((g) => {
    const contatos = [...g.telefones, ...g.emails];
    return `<article class="dono-card">
      <header class="dono-head">
        ${avatar(g.nome || '?', null, true)}
        <div class="info">
          <h2>${esc(g.nome || 'Sem dono informado')}</h2>
          <div class="contact">${contatos.length ? contatos.map((c) => `<span>${esc(c)}</span>`).join('') : '<span>Sem contato cadastrado</span>'}</div>
        </div>
        <span class="badge brand">${g.casas.length} ${g.casas.length === 1 ? 'casa' : 'casas'}</span>
      </header>
      ${g.casas.map((c) => `<div class="dono-casa">
        <div class="casa-line">
          <div><strong>${esc(c.nome)}</strong><div class="meta">${esc(c.endereco || 'Sem endereço')}${c.cep ? ` · CEP ${esc(c.cep)}` : ''} · ${esc(brl.format(c.valor ?? 0))}</div></div>
          <button class="btn row-btn" data-edit-casa="${c.id}">Editar casa</button>
        </div>
        <div class="socios-box">
          <span class="lbl">Sócios</span>
          ${(c.socios || []).length ? c.socios.map(socioChip).join('') : '<span class="no-socios">Nenhum sócio cadastrado.</span>'}
        </div>
      </div>`).join('')}
    </article>`;
  }).join('');
}

/* ==========================================================================
   Telas de listagem (genéricas)
   ========================================================================== */
const searchTerm = {};

function renderEntity(view, key) {
  const e = entities[key];
  view.innerHTML = `
    <div class="page-head">
      <div><h1>${esc(e.title)}</h1><p>${esc(e.description)}</p></div>
      <button class="btn primary" data-new>${esc(e.newLabel)}</button>
    </div>
    <section class="panel">
      ${state.errors[key] ? errorPanel(key) : `
        <div class="toolbar"><input type="search" id="search" placeholder="Buscar em ${esc(e.title.toLowerCase())}…" aria-label="Buscar" value="${esc(searchTerm[key] || '')}"></div>
        <div class="table-wrap" id="tableWrap"></div>`}
    </section>`;

  if (state.errors[key]) return;
  renderRows(key);
}

function renderRows(key) {
  const e = entities[key];
  const q = (searchTerm[key] || '').trim().toLowerCase();
  const items = state[key].filter((i) => !q || e.columns.some((c) => String(c.get(i)).toLowerCase().includes(q)));
  const wrap = qs('#tableWrap');

  if (!items.length) {
    wrap.innerHTML = q
        ? `<div class="empty"><strong>Nada encontrado</strong>Nenhum resultado para “${esc(searchTerm[key])}”.</div>`
        : `<div class="empty"><strong>${esc(e.emptyText)}</strong>Use o botão “${esc(e.newLabel)}” para começar.</div>`;
    return;
  }

  wrap.innerHTML = `<table>
    <thead><tr>
      ${e.columns.map((c) => `<th class="${c.cls === 'num' ? 'num' : ''}">${esc(c.label)}</th>`).join('')}
      <th class="actions"><span class="sr-only">Ações</span></th>
    </tr></thead>
    <tbody>
      ${items.map((i) => `<tr data-id="${i.id}">
        ${e.columns.map((c) => `<td class="${c.cls || ''}" ${c.cls === 'clip' ? `title="${esc(c.get(i))}"` : ''}>${c.html ? c.html(i) : esc(c.get(i))}</td>`).join('')}
        <td class="actions">
          ${e.canEdit ? '<button class="btn row-btn" data-edit>Editar</button>' : ''}
          <button class="btn row-btn del" data-del>Excluir</button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

/* Eventos da área principal (delegação) */
qs('#view').addEventListener('click', (ev) => {
  const key = currentKey();
  if (ev.target.closest('[data-retry]')) { refresh(); return; }
  if (key === 'inicio') return;

  if (ev.target.closest('[data-new]')) { openForm(key === 'donos' ? 'casas' : key, null); return; }

  if (key === 'donos') {
    const btn = ev.target.closest('[data-edit-casa]');
    const casa = btn && state.casas.find((c) => String(c.id) === btn.dataset.editCasa);
    if (casa) openForm('casas', casa);
    return;
  }

  const row = ev.target.closest('tr[data-id]');
  if (!row) return;
  const item = state[key].find((i) => String(i.id) === row.dataset.id);
  if (!item) return;
  if (ev.target.closest('[data-edit]')) openForm(key, item);
  if (ev.target.closest('[data-del]')) removeItem(key, item);
});

qs('#view').addEventListener('input', (ev) => {
  if (ev.target.id !== 'search') return;
  const key = currentKey();
  searchTerm[key] = ev.target.value;
  if (key === 'donos') renderDonosList();
  else renderRows(key);
});

/* ==========================================================================
   Formulário (criar / editar)
   ========================================================================== */
const formDlg = qs('#formDialog');
const form = qs('#entityForm');
let editing = null;   // { key, item }
let formFoto = null;  // foto atual do formulário (data URL ou null)

function socioRowHtml(s = {}) {
  return `<div class="socio-row">
    <div class="row-head"><span>Sócio</span><button type="button" class="icon-btn" data-del-socio aria-label="Remover sócio">✕</button></div>
    <input class="s-nome" type="text" placeholder="Nome do sócio" value="${esc(s.nome || '')}" aria-label="Nome do sócio">
    <div class="row-2">
      <input class="s-tel" type="tel" data-mask="phone" data-v="phone" inputmode="tel" placeholder="Telefone (opcional)" value="${esc(fmtPhone(s.telefone))}" aria-label="Telefone do sócio">
      <input class="s-email" type="email" data-v="email" placeholder="E-mail (opcional)" value="${esc(s.email || '')}" aria-label="E-mail do sócio">
    </div>
  </div>`;
}

function fieldHtml(f, item) {
  if (f.row) return `<div class="${f.cls || 'row-2'}">${f.row.map((x) => fieldHtml(x, item)).join('')}</div>`;
  if (f.type === 'heading') return `<h3 class="form-sub">${esc(f.label)}</h3>`;

  if (f.type === 'socios') {
    const lista = item?.socios || [];
    return `<div class="field" id="sociosField">
      <div class="socios-head">
        <h3>Sócios do dono</h3>
        <button type="button" class="btn row-btn" data-add-socio>+ Adicionar sócio</button>
      </div>
      <p class="hint">Opcional. Informe nome, telefone e e-mail de cada sócio.</p>
      <div class="socios-list" id="sociosList">${lista.map(socioRowHtml).join('')}</div>
    </div>`;
  }

  if (f.type === 'foto') {
    return `<div class="field">
      <span class="foto-label">${esc(f.label)}</span>
      <div class="foto-row">
        <span id="fotoPreview">${avatar(item?.nome, formFoto, true)}</span>
        <div>
          <input type="file" id="f_foto" accept="image/*" hidden>
          <button type="button" class="btn row-btn" data-foto-choose>${formFoto ? 'Trocar foto' : 'Escolher foto'}</button>
          <button type="button" class="btn row-btn del" data-foto-remove ${formFoto ? '' : 'hidden'}>Remover</button>
          <p class="hint">JPG, PNG ou WebP. A imagem é reduzida automaticamente.</p>
        </div>
      </div>
    </div>`;
  }

  const id = `f_${f.name}`;
  let val = item ? (f.ref ? item[f.name]?.id : item[f.name]) : '';
  const maskType = f.mask || (f.type === 'date' ? 'date' : '');
  if (val === null || val === undefined) val = '';
  if (maskType && FORMATTERS[maskType]) val = FORMATTERS[maskType](val);

  const validateType = f.validate || maskType;
  const attrs = [
    `id="${id}"`, `name="${f.name}"`,
    f.required ? 'required' : '',
    f.placeholder ? `placeholder="${esc(f.placeholder)}"` : (f.type === 'date' ? 'placeholder="dd/mm/aaaa"' : ''),
    f.inputmode ? `inputmode="${f.inputmode}"` : (f.type === 'date' ? 'inputmode="numeric"' : ''),
    maskType ? `data-mask="${maskType}"` : '',
    validateType && VALIDATORS[validateType] ? `data-v="${validateType}"` : '',
    f.step ? `step="${f.step}"` : '', f.min ? `min="${f.min}"` : '',
  ].join(' ');

  let control;
  let hint = f.hint || '';
  if (f.type === 'select') {
    const opts = f.ref
        ? state[f.ref].map((o) => [o.id, entities[f.ref].label(o), !!(f.optionDisabled && f.optionDisabled(o, item))])
        : f.options.map(([v, l]) => [v, l, false]);
    if (f.ref && !opts.length) hint = f.emptyHint || '';
    else if (f.ref && opts.every((o) => o[2])) hint = f.allDisabledHint || '';
    control = `<select ${attrs}>
      <option value="">Selecione…</option>
      ${opts.map(([v, l, off]) => `<option value="${esc(v)}" ${off ? 'disabled' : ''} ${String(v) === String(val) ? 'selected' : ''}>${esc(l + (off ? (f.disabledSuffix || '') : ''))}</option>`).join('')}
    </select>`;
  } else if (f.type === 'textarea') {
    control = `<textarea ${attrs}>${esc(val)}</textarea>`;
  } else {
    // datas viram texto com máscara dd/mm/aaaa
    control = `<input type="${f.type === 'date' ? 'text' : f.type}" ${attrs} value="${esc(val)}">`;
  }

  return `<div class="field">
    <label for="${id}">${esc(f.label)}${f.required ? ' <span class="req" aria-hidden="true">*</span>' : ''}</label>
    ${control}
    ${hint ? `<p class="hint">${esc(hint)}</p>` : ''}
  </div>`;
}

const flatFields = (fields) => fields.flatMap((f) => (f.row ? f.row : [f]));

function validateSocios() {
  form.querySelectorAll('.socio-row').forEach((row) => {
    const nome = qs('.s-nome', row);
    const outros = qs('.s-tel', row).value.trim() || qs('.s-email', row).value.trim();
    nome.setCustomValidity(!nome.value.trim() && outros ? 'Informe o nome do sócio.' : '');
  });
}

function validateAll() {
  form.querySelectorAll('[data-v]').forEach(validateInput);
  validateSocios();
}

function openForm(key, item) {
  const e = entities[key];
  editing = { key, item };
  formFoto = item?.foto || null;
  qs('#formTitle').textContent = item ? e.editLabel : e.newLabel;
  qs('#formFields').innerHTML = e.fields.map((f) => fieldHtml(f, item)).join('');
  applyMasks(qs('#formFields'));
  validateAll();
  qs('#formError').hidden = true;
  qs('#formSubmit').disabled = false;
  qs('#formSubmit').textContent = 'Salvar';
  formDlg.showModal();
  const first = qs('#formFields input:not([type=file]), #formFields select, #formFields textarea');
  if (first) first.focus();
}

function closeForm() { formDlg.close(); editing = null; formFoto = null; }
qs('#formClose').addEventListener('click', closeForm);
qs('#formCancel').addEventListener('click', closeForm);
formDlg.addEventListener('click', (ev) => { if (ev.target === formDlg) closeForm(); });

/* Validação ao digitar / ao sair do campo */
form.addEventListener('input', (ev) => {
  const el = ev.target;
  if (el.dataset && el.dataset.v) validateInput(el);
  if (el.closest('.socio-row')) validateSocios();
});
form.addEventListener('focusout', (ev) => { if (ev.target.classList) ev.target.classList.add('touched'); });

/* Sócios: adicionar / remover linhas */
qs('#formFields').addEventListener('click', (ev) => {
  if (ev.target.closest('[data-add-socio]')) {
    const list = qs('#sociosList');
    list.insertAdjacentHTML('beforeend', socioRowHtml());
    const row = list.lastElementChild;
    applyMasks(row);
    qs('.s-nome', row).focus();
    return;
  }
  const del = ev.target.closest('[data-del-socio]');
  if (del) { del.closest('.socio-row').remove(); validateSocios(); return; }

  /* Foto */
  if (ev.target.closest('[data-foto-choose]')) { qs('#f_foto').click(); return; }
  if (ev.target.closest('[data-foto-remove]')) { setFoto(null); }
});

qs('#formFields').addEventListener('change', async (ev) => {
  if (ev.target.id !== 'f_foto') return;
  const file = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if (!file) return;
  const errBox = qs('#formError');
  if (!/^image\//.test(file.type)) { errBox.textContent = 'Escolha um arquivo de imagem (JPG, PNG ou WebP).'; errBox.hidden = false; return; }
  if (file.size > 10 * 1024 * 1024) { errBox.textContent = 'A imagem é grande demais (máximo de 10 MB).'; errBox.hidden = false; return; }
  try {
    errBox.hidden = true;
    setFoto(await resizeImage(file, 320));
  } catch {
    errBox.textContent = 'Não foi possível ler essa imagem. Tente outro arquivo.';
    errBox.hidden = false;
  }
});

function setFoto(dataUrl) {
  formFoto = dataUrl;
  const nome = qs('#f_nome') ? qs('#f_nome').value : editing?.item?.nome;
  qs('#fotoPreview').innerHTML = avatar(nome, formFoto, true);
  qs('[data-foto-remove]').hidden = !formFoto;
  qs('[data-foto-choose]').textContent = formFoto ? 'Trocar foto' : 'Escolher foto';
}

// Recorta no centro (quadrado), reduz para `size` px e comprime em JPEG
function resizeImage(file, size) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - side) / 2;
        const sy = (img.naturalHeight - side) / 2;
        const out = Math.min(size, side);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = out;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; // PNG transparente vira fundo branco no JPEG
        ctx.fillRect(0, 0, out, out);
        ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (err) { reject(err); }
      finally { URL.revokeObjectURL(url); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagem inválida')); };
    img.src = url;
  });
}

function buildPayload(e) {
  const fd = new FormData(form);
  const payload = {};
  flatFields(e.fields).forEach((f) => {
    if (f.type === 'heading') return;
    if (f.type === 'foto') { payload[f.name] = formFoto; return; }
    if (f.type === 'socios') {
      payload[f.name] = [...form.querySelectorAll('.socio-row')].map((row) => ({
        nome: qs('.s-nome', row).value.trim(),
        telefone: qs('.s-tel', row).value.trim() || null,
        email: qs('.s-email', row).value.trim() || null,
      })).filter((s) => s.nome || s.telefone || s.email);
      return;
    }
    const raw = (fd.get(f.name) ?? '').toString().trim();
    if (f.ref) payload[f.name] = raw ? { id: Number(raw) } : null;
    else if (f.number) payload[f.name] = raw === '' ? 0 : Number(raw);
    else if (f.type === 'date') payload[f.name] = raw === '' ? null : brToIso(raw);
    else payload[f.name] = raw === '' ? null : raw;
  });
  return payload;
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (!editing) return;
  const { key, item } = editing;
  const e = entities[key];
  const errBox = qs('#formError');
  errBox.hidden = true;

  form.querySelectorAll('input, select, textarea').forEach((el) => el.classList.add('touched'));
  validateAll();
  if (!form.checkValidity()) { form.reportValidity(); return; }

  const payload = buildPayload(e);
  const invalid = e.validate && e.validate(payload, item);
  if (invalid) { errBox.textContent = invalid; errBox.hidden = false; return; }

  const btn = qs('#formSubmit');
  btn.disabled = true;
  btn.textContent = 'Salvando…';
  try {
    if (item) await api(`${e.path}/${item.id}`, { method: 'PUT', body: payload });
    else await api(e.path, { method: 'POST', body: payload });
    closeForm();
    toast(item ? 'Alterações salvas.' : 'Cadastro salvo.');
    await refresh();
  } catch (err) {
    errBox.textContent = (e.conflictMsg && (err.status === 409 || (err.status === 500 && e.conflictOn500))) ? e.conflictMsg : err.message;
    errBox.hidden = false;
    btn.disabled = false;
    btn.textContent = 'Salvar';
  }
});

/* ==========================================================================
   Exclusão
   ========================================================================== */
const confirmDlg = qs('#confirmDialog');

function confirmDelete(text) {
  qs('#confirmText').textContent = text;
  return new Promise((resolve) => {
    confirmDlg.returnValue = '';
    confirmDlg.addEventListener('close', () => resolve(confirmDlg.returnValue === 'ok'), { once: true });
    confirmDlg.showModal();
  });
}

async function removeItem(key, item) {
  const e = entities[key];
  const ok = await confirmDelete(`Excluir ${e.noun} “${e.label(item)}”? Esta ação não pode ser desfeita.`);
  if (!ok) return;
  try {
    await api(`${e.path}/${item.id}`, { method: 'DELETE' });
    toast('Registro excluído.');
    await refresh();
  } catch (err) {
    toast(err.status === 500 && e.inUseMsg ? e.inUseMsg : err.message, 'err');
  }
}

/* ==========================================================================
   Endereço da API + inicialização
   ========================================================================== */
qs('#apiBase').value = API_BASE;
qs('#saveApi').addEventListener('click', () => {
  const v = qs('#apiBase').value.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(v)) { toast('Informe um endereço começando com http:// ou https://', 'err'); return; }
  API_BASE = v;
  lsSet('apiBase', v);
  loaded = false;
  route();
  refresh();
});

window.addEventListener('hashchange', route);
route();
loadAll().then(() => { renderNav(); route(); });
