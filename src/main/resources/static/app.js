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
   ========================================================================== */
const $ = (sel, root = document) => root.querySelector(sel);

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
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), type === 'err' ? 6500 : 3500);
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
   Definição das entidades (uma tabela de configuração gera telas e formulários)
   ========================================================================== */
const TIPOS_VINCULO = [['PROPRIETARIO', 'Proprietário'], ['SOCIO', 'Sócio']];
const tipoLabel = (v) => (TIPOS_VINCULO.find(([k]) => k === v) || [, v])[1];

const state = { casas: [], cuidadores: [], pessoas: [], alocacoes: [], vinculos: [], errors: {} };
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

const entities = {
  casas: {
    path: '/api/casas', title: 'Casas', description: 'Imóveis atendidos e seus responsáveis.',
    newLabel: 'Nova casa', editLabel: 'Editar casa', noun: 'a casa', canEdit: false,
    emptyText: 'Nenhuma casa cadastrada.',
    inUseMsg: 'Esta casa tem alocações ou vínculos e não pode ser excluída. Remova-os primeiro.',
    columns: [
      { label: 'Nome', get: (i) => i.nome },
      { label: 'Endereço', get: (i) => i.endereco },
      { label: 'Dono', get: (i) => i.dono },
      { label: 'Valor', get: (i) => brl.format(i.valor ?? 0), cls: 'num' },
    ],
    fields: [
      { name: 'nome', label: 'Nome da casa', type: 'text', required: true },
      { name: 'endereco', label: 'Endereço', type: 'text' },
      { name: 'dono', label: 'Dono', type: 'text' },
      { name: 'valor', label: 'Valor (R$)', type: 'number', step: '0.01', min: '0', number: true },
    ],
    label: (i) => i.nome,
  },

  cuidadores: {
    path: '/api/cuidadores', title: 'Cuidadores', description: 'Profissionais disponíveis para alocação.',
    newLabel: 'Novo cuidador', editLabel: 'Editar cuidador', noun: 'o cuidador', canEdit: false,
    emptyText: 'Nenhum cuidador cadastrado.',
    inUseMsg: 'Este cuidador possui alocações e não pode ser excluído. Remova-as primeiro.',
    columns: [
      { label: 'Nome', get: (i) => i.nome },
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
      { name: 'nome', label: 'Nome', type: 'text', required: true },
      { name: 'telefone', label: 'Telefone', type: 'tel', placeholder: '(11) 91234-5678' },
      { name: 'cpf', label: 'CPF', type: 'text', placeholder: '000.000.000-00', inputmode: 'numeric' },
    ],
    label: (i) => i.nome,
  },

  pessoas: {
    path: '/api/pessoas', title: 'Pessoas', description: 'Proprietários e sócios das casas.',
    newLabel: 'Nova pessoa', editLabel: 'Editar pessoa', noun: 'a pessoa', canEdit: false,
    emptyText: 'Nenhuma pessoa cadastrada.',
    inUseMsg: 'Esta pessoa está vinculada a uma casa e não pode ser excluída. Remova o vínculo primeiro.',
    columns: [
      { label: 'Nome', get: (i) => i.nome },
      { label: 'Telefone', get: (i) => i.telefone || '—' },
      { label: 'E-mail', get: (i) => i.email || '—' },
    ],
    fields: [
      { name: 'nome', label: 'Nome', type: 'text', required: true },
      { name: 'telefone', label: 'Telefone', type: 'tel' },
      { name: 'email', label: 'E-mail', type: 'email' },
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

  vinculos: {
    path: '/api/casa-pessoas', title: 'Vínculos', description: 'Relação entre pessoas e casas (proprietário ou sócio).',
    newLabel: 'Novo vínculo', editLabel: 'Editar vínculo', noun: 'o vínculo', canEdit: true,
    emptyText: 'Nenhum vínculo registrado.',
    conflictMsg: 'Esta pessoa já está vinculada a esta casa.',
    conflictOn500: true,
    columns: [
      { label: 'Casa', get: (i) => refName('casas', i.casa) },
      { label: 'Pessoa', get: (i) => refName('pessoas', i.pessoa) },
      {
        label: 'Tipo', get: (i) => tipoLabel(i.tipoVinculo),
        html: (i) => `<span class="badge ${i.tipoVinculo === 'PROPRIETARIO' ? 'brand' : 'warn'}">${esc(tipoLabel(i.tipoVinculo))}</span>`,
      },
    ],
    fields: [
      { name: 'casa', label: 'Casa', type: 'select', ref: 'casas', required: true, emptyHint: 'Cadastre uma casa antes de criar o vínculo.' },
      { name: 'pessoa', label: 'Pessoa', type: 'select', ref: 'pessoas', required: true, emptyHint: 'Cadastre uma pessoa antes de criar o vínculo.' },
      { name: 'tipoVinculo', label: 'Tipo de vínculo', type: 'select', options: TIPOS_VINCULO, required: true },
    ],
    label: (i) => `${refName('pessoas', i.pessoa)} — ${refName('casas', i.casa)}`,
  },
};

const NAV = [
  { key: 'inicio', label: 'Visão geral' },
  { key: 'casas', label: 'Casas' },
  { key: 'cuidadores', label: 'Cuidadores' },
  { key: 'alocacoes', label: 'Alocações' },
  { key: 'pessoas', label: 'Pessoas' },
  { key: 'vinculos', label: 'Vínculos' },
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
  const el = $('#apiStatus');
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

function renderNav() {
  const cur = currentKey();
  $('#nav').innerHTML = NAV.map((n) => {
    const count = n.key !== 'inicio' && loaded && !state.errors[n.key] ? `<span class="count">${state[n.key].length}</span>` : '';
    return `<a href="#/${n.key}" ${n.key === cur ? 'aria-current="page"' : ''}>${esc(n.label)}${count}</a>`;
  }).join('');
}

function route() {
  const key = currentKey();
  renderNav();
  const view = $('#view');
  document.title = `${NAV.find((n) => n.key === key).label} · Cuidadores`;

  if (!loaded) {
    view.innerHTML = '<div class="state-msg">Carregando…</div>';
    return;
  }
  if (key === 'inicio') renderDashboard(view);
  else renderEntity(view, key);
}

/* ==========================================================================
   Visão geral
   ========================================================================== */
function errorPanel(key) {
  const err = state.errors[key];
  let extra = '';
  if (err.status === 500 && (key === 'alocacoes' || key === 'vinculos')) {
    extra = ' Se o erro persistir, é provável que a serialização das relações LAZY esteja falhando no back-end (veja o README).';
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
      ${stat('pessoas', 'Pessoas', state.pessoas.length)}
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
  const wrap = $('#tableWrap');

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
$('#view').addEventListener('click', (ev) => {
  const key = currentKey();
  if (ev.target.closest('[data-retry]')) { refresh(); return; }
  if (key === 'inicio') return;

  if (ev.target.closest('[data-new]')) { openForm(key, null); return; }

  const row = ev.target.closest('tr[data-id]');
  if (!row) return;
  const item = state[key].find((i) => String(i.id) === row.dataset.id);
  if (!item) return;
  if (ev.target.closest('[data-edit]')) openForm(key, item);
  if (ev.target.closest('[data-del]')) removeItem(key, item);
});

$('#view').addEventListener('input', (ev) => {
  if (ev.target.id === 'search') {
    searchTerm[currentKey()] = ev.target.value;
    renderRows(currentKey());
  }
});

/* ==========================================================================
   Formulário (criar / editar)
   ========================================================================== */
const formDlg = $('#formDialog');
const form = $('#entityForm');
let editing = null; // { key, item }

function fieldHtml(f, item, key) {
  if (f.row) return `<div class="row-2">${f.row.map((x) => fieldHtml(x, item, key)).join('')}</div>`;

  const id = `f_${f.name}`;
  let val = item ? (f.ref ? item[f.name]?.id : item[f.name]) : '';
  if (f.type === 'date') val = normDate(val);
  if (val === null || val === undefined) val = '';

  const attrs = [
    `id="${id}"`, `name="${f.name}"`,
    f.required ? 'required' : '',
    f.placeholder ? `placeholder="${esc(f.placeholder)}"` : '',
    f.inputmode ? `inputmode="${f.inputmode}"` : '',
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
    control = `<input type="${f.type}" ${attrs} value="${esc(val)}">`;
  }

  return `<div class="field">
    <label for="${id}">${esc(f.label)}${f.required ? ' <span class="req" aria-hidden="true">*</span>' : ''}</label>
    ${control}
    ${hint ? `<p class="hint">${esc(hint)}</p>` : ''}
  </div>`;
}

const flatFields = (fields) => fields.flatMap((f) => (f.row ? f.row : [f]));

function openForm(key, item) {
  const e = entities[key];
  editing = { key, item };
  $('#formTitle').textContent = item ? e.editLabel : e.newLabel;
  $('#formFields').innerHTML = e.fields.map((f) => fieldHtml(f, item, key)).join('');
  $('#formError').hidden = true;
  $('#formSubmit').disabled = false;
  $('#formSubmit').textContent = 'Salvar';
  formDlg.showModal();
  const first = $('#formFields input, #formFields select, #formFields textarea');
  if (first) first.focus();
}

function closeForm() { formDlg.close(); editing = null; }
$('#formClose').addEventListener('click', closeForm);
$('#formCancel').addEventListener('click', closeForm);
formDlg.addEventListener('click', (ev) => { if (ev.target === formDlg) closeForm(); });

function buildPayload(e) {
  const fd = new FormData(form);
  const payload = {};
  flatFields(e.fields).forEach((f) => {
    const raw = (fd.get(f.name) ?? '').toString().trim();
    if (f.ref) payload[f.name] = raw ? { id: Number(raw) } : null;
    else if (f.number) payload[f.name] = raw === '' ? 0 : Number(raw);
    else payload[f.name] = raw === '' ? null : raw;
  });
  return payload;
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (!editing) return;
  const { key, item } = editing;
  const e = entities[key];
  const errBox = $('#formError');
  errBox.hidden = true;

  form.querySelectorAll('input, select, textarea').forEach((el) => el.classList.add('touched'));
  if (!form.checkValidity()) { form.reportValidity(); return; }

  const payload = buildPayload(e);
  const invalid = e.validate && e.validate(payload, item);
  if (invalid) { errBox.textContent = invalid; errBox.hidden = false; return; }

  const btn = $('#formSubmit');
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
const confirmDlg = $('#confirmDialog');

function confirmDelete(text) {
  $('#confirmText').textContent = text;
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
$('#apiBase').value = API_BASE;
$('#saveApi').addEventListener('click', () => {
  const v = $('#apiBase').value.trim().replace(/\/+$/, '');
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
