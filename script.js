// Куда уходят заявки. TODO: заменить на реальный адрес или подключить Telegram-бота / Formspree
const LEAD_EMAIL = 'info@ostdrivegroupe.by';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const SVG_NS = 'http://www.w3.org/2000/svg';

// ---- Отверстия пылеудаления на шлифкругах ----
function drillHoles(group, rings) {
  rings.forEach(([radius, count, size, offset = 0]) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + offset;
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', (Math.cos(a) * radius).toFixed(2));
      c.setAttribute('cy', (Math.sin(a) * radius).toFixed(2));
      c.setAttribute('r', size);
      group.appendChild(c);
    }
  });
}
if ($('#holes')) drillHoles($('#holes'), [[72, 6, 9], [140, 9, 9, Math.PI / 9]]);
$$('.holes-sm').forEach(g => drillHoles(g, [[40, 6, 6], [72, 9, 6, Math.PI / 9]]));

// ---- Анимация заголовка на главной ----
$$('.hero__title .line').forEach((line, i) => {
  line.innerHTML = `<i>${line.innerHTML}</i>`;
  line.style.setProperty('--i', i);
});
document.body.classList.add('intro');

// ---- Шапка: фон после прокрутки ----
const header = $('.header');
const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 20);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// ---- Мобильное меню ----
const burger = $('#burger');
const nav = $('#nav');
function setMenu(open) {
  nav.classList.toggle('is-open', open);
  burger.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
}
burger.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
$$('a', nav).forEach(a => a.addEventListener('click', () => setMenu(false)));

// ---- Главная: две позиции (верх / низ), переключение одним движением колеса ----
if ($$('.screen').length > 1) {
  const fullscreen = matchMedia('(min-width: 921px) and (min-height: 620px)');
  let busy = false;
  const bottom = () => document.documentElement.scrollHeight - window.innerHeight;
  const positions = () => [0, bottom()];
  const current = () => (window.scrollY > bottom() / 2 ? 1 : 0);
  const go = i => {
    if (busy || i === current()) return;
    busy = true;
    window.scrollTo({ top: positions()[i], behavior: 'smooth' });
    setTimeout(() => { busy = false; }, 900);
  };
  window.addEventListener('wheel', e => {
    if (!fullscreen.matches || nav.classList.contains('is-open') || document.body.classList.contains('modal-open')) return;
    e.preventDefault();
    if (Math.abs(e.deltaY) < 4) return;
    go(e.deltaY > 0 ? 1 : 0);
  }, { passive: false });
  window.addEventListener('keydown', e => {
    if (!fullscreen.matches || document.body.classList.contains('modal-open')) return;
    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(1); }
    if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); go(0); }
  });
  // после изменения размера окна остаёмся ровно на своём экране
  window.addEventListener('resize', () => {
    if (fullscreen.matches) window.scrollTo({ top: positions()[current()] });
  });
}

// ---- Стадии проектов в штампах чертежей ----
const STAGES = ['Идея', 'Концепт', 'Прототип', 'Пилот', 'Серия'];
$$('.stamp__stage').forEach(el => {
  const n = Number(el.dataset.stage);
  $('b', el).textContent = `${STAGES[n - 1]} · ${n}/${STAGES.length}`;
  el.style.setProperty('--p', `${(n / STAGES.length) * 100}%`);
});

// ---- Всплывающая форма заявки (одна на все страницы) ----
const FORM_FIELDS = `
  <div class="tabs" role="tablist">
    <button type="button" class="tab is-active" data-tab="workshop" role="tab" aria-selected="true">Автомастерская</button>
    <button type="button" class="tab" data-tab="partner" role="tab" aria-selected="false">Инвестор / партнёр</button>
  </div>
  <input type="hidden" name="type" value="workshop">
  <label class="field"><input name="name" required autocomplete="name" placeholder=" "><span>Имя *</span></label>
  <label class="field"><input name="company" autocomplete="organization" placeholder=" "><span>Компания</span></label>
  <div class="field-row">
    <label class="field"><input name="phone" type="tel" required autocomplete="tel" placeholder=" "><span>Телефон *</span></label>
    <label class="field"><input name="email" type="email" autocomplete="email" placeholder=" "><span>Email</span></label>
  </div>
  <label class="field" data-only="workshop"><input name="product" placeholder=" "><span>Что интересует</span></label>
  <label class="field"><textarea name="message" rows="2" placeholder=" "></textarea><span>Комментарий</span></label>
  <button class="btn btn--accent btn--lg btn--block form__submit" type="submit">Получить прайс <span class="arr">↗</span></button>
  <p class="form__hint">Нажимая кнопку, вы соглашаетесь на обработку персональных данных.</p>
  <p class="form__status" role="status"></p>`;

document.body.insertAdjacentHTML('beforeend', `
<div class="modal" id="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle" hidden>
  <div class="modal__backdrop" data-close></div>
  <div class="modal__dialog">
    <button type="button" class="modal__close" data-close aria-label="Закрыть"><span></span><span></span></button>
    <span class="mono modal__idx">Заявка · ответ в течение рабочего дня</span>
    <h2 class="modal__title" id="modalTitle">Получить прайс</h2>
    <form class="form form--modal" novalidate>${FORM_FIELDS}</form>
  </div>
</div>`);

const TAB_TEXT = { workshop: 'Получить прайс', partner: 'Запросить презентацию' };

function initForm(form, onTab) {
  const submitBtn = $('.form__submit', form);
  const status = $('.form__status', form);

  form.setTab = type => {
    form.elements.type.value = type;
    $$('.tab', form).forEach(t => {
      const active = t.dataset.tab === type;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', String(active));
    });
    $$('[data-only]', form).forEach(el => { el.hidden = el.dataset.only !== type; });
    submitBtn.innerHTML = `${TAB_TEXT[type]} <span class="arr">↗</span>`;
    if (onTab) onTab(type);
  };
  $$('.tab', form).forEach(t => t.addEventListener('click', () => form.setTab(t.dataset.tab)));

  form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    $$('[required]', form).forEach(input => {
      const bad = !input.value.trim();
      input.closest('.field').classList.toggle('is-invalid', bad);
      if (bad) ok = false;
    });
    if (!ok) {
      status.textContent = 'Заполните имя и телефон.';
      status.className = 'form__status is-err';
      return;
    }

    const f = form.elements;
    const isPartner = f.type.value === 'partner';
    const subject = isPartner ? 'Инвестор / партнёр — запрос презентации' : 'Запрос оптового прайса';
    const body = [
      `Тип: ${isPartner ? 'Инвестор / партнёр' : 'Автомастерская'}`,
      `Имя: ${f.name.value}`,
      `Компания: ${f.company.value}`,
      `Телефон: ${f.phone.value}`,
      `Email: ${f.email.value}`,
      !isPartner && `Интересует: ${f.product.value}`,
      `Комментарий: ${f.message.value}`,
    ].filter(Boolean).join('\n');

    window.location.href = `mailto:${LEAD_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    status.textContent = 'Спасибо! Откроется почтовая программа с готовым письмом.';
    status.className = 'form__status is-ok';
  });

  $$('input, textarea', form).forEach(el =>
    el.addEventListener('input', () => el.closest('.field').classList.remove('is-invalid')));
}

const modal = $('#modal');
const modalForm = $('.form--modal', modal);
initForm(modalForm, type => { $('#modalTitle').textContent = TAB_TEXT[type]; });

let lastFocus = null;
function openModal({ tab = 'workshop', product = '' } = {}) {
  lastFocus = document.activeElement;
  setMenu(false);
  modalForm.setTab(tab);
  if (product) modalForm.elements.product.value = product;
  $('.form__status', modalForm).textContent = '';
  modal.hidden = false;
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => modal.classList.add('is-open'));
  setTimeout(() => modalForm.elements.name.focus({ preventScroll: true }), 250);
}
function closeModal() {
  modal.classList.remove('is-open');
  document.body.classList.remove('modal-open');
  setTimeout(() => { modal.hidden = true; }, 300);
  if (lastFocus) lastFocus.focus({ preventScroll: true });
}
$$('[data-close]', modal).forEach(el => el.addEventListener('click', closeModal));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

$$('[data-modal]').forEach(el => el.addEventListener('click', e => {
  e.preventDefault();
  openModal({ tab: el.dataset.tab || 'workshop' });
}));

// Каталог: клик по категории — форма с подставленным товаром
$$('.tile').forEach(card => card.addEventListener('click', () => openModal({ product: card.dataset.product })));

// ---- Форма на странице контактов ----
const pageForm = $('#form');
if (pageForm) {
  initForm(pageForm);
  // параметры из ссылок других страниц: ?type=partner, ?product=...
  const params = new URLSearchParams(location.search);
  if (params.get('type') === 'partner') pageForm.setTab('partner');
  if (params.get('product')) pageForm.elements.product.value = params.get('product');
}

// ---- Появление блоков при прокрутке (с лёгкой «лесенкой» внутри группы) ----
const groups = ['.head', '.tile', '.row', '.flow__steps li', '.sheet', '.cycle__node', '.roadmap li', '.invest', '#form', '.contacts__list'];
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    const el = en.target;
    el.classList.add('is-visible');
    io.unobserve(el);
    // после появления снимаем класс, чтобы не мешал собственным hover-переходам карточек
    setTimeout(() => el.classList.remove('reveal', 'is-visible'), 1300);
  }), { threshold: 0.12 });
  groups.forEach(sel => $$(sel).forEach((el, i) => {
    el.classList.add('reveal');
    el.style.setProperty('--delay', `${(i % 4) * 0.07}s`);
    io.observe(el);
  }));
}

$$('.year').forEach(el => { el.textContent = new Date().getFullYear(); });
