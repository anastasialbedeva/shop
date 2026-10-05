'use strict';

/* ===== Константы и элементы страницы ===== */
const STORAGE_KEY = 'green-shelf-cart';
const MAX_QTY = 99;

const productsEl = document.getElementById('products');
const productsCountEl = document.getElementById('productsCount');
const cartListEl = document.getElementById('cartList');
const cartEmptyEl = document.getElementById('cartEmpty');
const cartTotalEl = document.getElementById('cartTotal');
const cartCountEl = document.getElementById('cartCount');
const checkoutBtn = document.getElementById('checkoutBtn');
const clearBtn = document.getElementById('clearBtn');

const modal = document.getElementById('orderModal');
const orderForm = document.getElementById('orderForm');
const orderTotalEl = document.getElementById('orderTotal');
const orderSuccess = document.getElementById('orderSuccess');
const orderSuccessText = document.getElementById('orderSuccessText');

const toastEl = document.getElementById('toast');

/* ===== Вспомогательные функции ===== */
// Создаёт элемент с классом и текстом (текст вставляется безопасно через textContent)
function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function formatPrice(value) {
  return `${value.toLocaleString('ru-RU')} ₽`;
}

function getProduct(id) {
  return PRODUCTS.find((product) => product.id === id);
}

let toastTimer;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2000);
}

/* ===== Состояние корзины ===== */
// Корзина — массив { id, qty }; название и цена берутся из data.js
let cart = loadCart();

function loadCart() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(data)) return [];
    return data
      .filter((item) => item && getProduct(item.id) && Number.isInteger(item.qty) && item.qty > 0)
      .map((item) => ({ id: item.id, qty: Math.min(item.qty, MAX_QTY) }));
  } catch {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // localStorage может быть недоступен (например, в приватном режиме)
  }
}

function getTotal() {
  return cart.reduce((sum, item) => sum + getProduct(item.id).price * item.qty, 0);
}

function getCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

/* ===== Операции с корзиной ===== */
function addToCart(id) {
  const item = cart.find((i) => i.id === id);
  if (item) {
    item.qty = Math.min(item.qty + 1, MAX_QTY);
  } else {
    cart.push({ id, qty: 1 });
  }
  updateCart();
  bumpCounter();
}

function removeFromCart(id) {
  cart = cart.filter((item) => item.id !== id);
  updateCart();
  showToast(`«${getProduct(id).name}» удалён из корзины`);
}

function setQty(id, qty) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  item.qty = Math.min(Math.max(qty, 1), MAX_QTY);
  updateCart();
}

function clearCart() {
  cart = [];
  updateCart();
}

// Любое изменение корзины: сохраняем в localStorage и перерисовываем
function updateCart() {
  saveCart();
  renderCart();
}

/* ===== Отрисовка каталога ===== */
function createProductCard(product) {
  const li = document.createElement('li');
  const card = createElement('article', 'card');
  card.dataset.id = product.id;

  const image = createElement('div', 'card__image', product.icon);
  image.style.setProperty('--tint', product.color);
  image.setAttribute('aria-hidden', 'true');

  const body = createElement('div', 'card__body');
  const bottom = createElement('div', 'card__bottom');
  const button = createElement('button', 'btn btn--primary card__btn', 'Добавить в корзину');
  button.type = 'button';

  bottom.append(createElement('p', 'card__price', formatPrice(product.price)), button);
  body.append(
    createElement('h3', 'card__title', product.name),
    createElement('p', 'card__desc', product.description),
    bottom
  );
  card.append(image, body);
  li.append(card);
  return li;
}

function renderProducts() {
  productsEl.replaceChildren(...PRODUCTS.map(createProductCard));
  productsCountEl.textContent = `${PRODUCTS.length} растений в наличии`;
}

/* ===== Отрисовка корзины ===== */
function createQtyButton(action, label, symbol, disabled) {
  const button = createElement('button', 'qty__btn', symbol);
  button.type = 'button';
  button.dataset.action = action;
  button.disabled = disabled;
  button.setAttribute('aria-label', label);
  return button;
}

function createCartItem(item) {
  const product = getProduct(item.id);
  const li = createElement('li', 'cart-item');
  li.dataset.id = item.id;

  const icon = createElement('span', 'cart-item__icon', product.icon);
  icon.setAttribute('aria-hidden', 'true');

  const info = createElement('div', 'cart-item__info');
  info.append(
    createElement('p', 'cart-item__name', product.name),
    createElement('p', 'cart-item__price', `${formatPrice(product.price)} за шт.`)
  );

  const removeBtn = createElement('button', 'cart-item__remove', '✕');
  removeBtn.type = 'button';
  removeBtn.dataset.action = 'remove';
  removeBtn.setAttribute('aria-label', `Удалить ${product.name} из корзины`);

  const input = createElement('input', 'qty__input');
  input.type = 'number';
  input.min = '1';
  input.max = String(MAX_QTY);
  input.value = String(item.qty);
  input.setAttribute('aria-label', `Количество: ${product.name}`);

  const qty = createElement('div', 'qty');
  qty.append(
    createQtyButton('dec', 'Уменьшить количество', '−', item.qty <= 1),
    input,
    createQtyButton('inc', 'Увеличить количество', '+', item.qty >= MAX_QTY)
  );

  const sum = createElement('p', 'cart-item__sum', formatPrice(product.price * item.qty));

  li.append(icon, info, removeBtn, qty, sum);
  return li;
}

function renderCart() {
  const isEmpty = cart.length === 0;

  cartCountEl.textContent = getCount();
  cartTotalEl.textContent = formatPrice(getTotal());
  cartEmptyEl.hidden = !isEmpty;
  cartListEl.hidden = isEmpty;
  checkoutBtn.disabled = isEmpty;
  clearBtn.disabled = isEmpty;

  cartListEl.replaceChildren(...cart.map(createCartItem));
}

function bumpCounter() {
  cartCountEl.classList.remove('is-bumped');
  void cartCountEl.offsetWidth; // перезапуск анимации
  cartCountEl.classList.add('is-bumped');
}

/* ===== Обработчики: каталог ===== */
productsEl.addEventListener('click', (event) => {
  const button = event.target.closest('.card__btn');
  if (!button) return;

  const id = button.closest('.card').dataset.id;
  addToCart(id);
  showToast(`«${getProduct(id).name}» добавлен в корзину`);

  button.textContent = 'Добавлено ✓';
  button.classList.add('is-added');
  clearTimeout(button.resetTimer);
  button.resetTimer = setTimeout(() => {
    button.textContent = 'Добавить в корзину';
    button.classList.remove('is-added');
  }, 1200);
});

/* ===== Обработчики: корзина ===== */
cartListEl.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const id = button.closest('.cart-item').dataset.id;
  const item = cart.find((i) => i.id === id);
  if (!item) return;

  switch (button.dataset.action) {
    case 'inc':
      setQty(id, item.qty + 1);
      break;
    case 'dec':
      setQty(id, item.qty - 1);
      break;
    case 'remove':
      removeFromCart(id);
      break;
  }
});

// Ручной ввод количества
cartListEl.addEventListener('change', (event) => {
  if (!event.target.matches('.qty__input')) return;
  const id = event.target.closest('.cart-item').dataset.id;
  const value = parseInt(event.target.value, 10);

  if (Number.isNaN(value)) {
    renderCart(); // вернуть прежнее значение
    return;
  }
  setQty(id, value);
});

cartListEl.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.target.matches('.qty__input')) {
    event.target.blur();
  }
});

clearBtn.addEventListener('click', () => {
  clearCart();
  showToast('Корзина очищена');
});

// Синхронизация корзины между вкладками
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) {
    cart = loadCart();
    renderCart();
  }
});

/* ===== Модальное окно ===== */
checkoutBtn.addEventListener('click', () => {
  if (cart.length === 0) return;
  orderForm.hidden = false;
  orderSuccess.hidden = true;
  orderTotalEl.textContent = formatPrice(getTotal());
  modal.showModal();
  orderForm.querySelector('input').focus();
});

modal.addEventListener('click', (event) => {
  // Клик по кнопке закрытия или по затемнённому фону
  if (event.target.closest('[data-close]') || event.target === modal) {
    modal.close();
  }
});

/* ===== Валидация формы ===== */
const NAME_PATTERN = /^[\p{L}][\p{L}\s'-]*$/u;

const validators = {
  firstName(value) {
    const v = value.trim();
    if (!v) return 'Введите имя';
    if (v.length < 2 || !NAME_PATTERN.test(v)) return 'Имя должно содержать только буквы (минимум 2)';
    return true;
  },
  lastName(value) {
    const v = value.trim();
    if (!v) return 'Введите фамилию';
    if (v.length < 2 || !NAME_PATTERN.test(v)) return 'Фамилия должна содержать только буквы (минимум 2)';
    return true;
  },
  address(value) {
    const v = value.trim();
    if (!v) return 'Укажите адрес доставки';
    if (v.length < 5) return 'Адрес слишком короткий';
    return true;
  },
  phone(value) {
    const v = value.trim();
    if (!v) return 'Укажите номер телефона';
    const digits = v.replace(/\D/g, '');
    if (!/^\+?[\d\s()-]+$/.test(v) || digits.length < 10 || digits.length > 15) {
      return 'Введите корректный номер, например +7 900 123-45-67';
    }
    return true;
  },
};

function validateField(input) {
  const result = validators[input.name](input.value);
  const isValid = result === true;
  const field = input.closest('.field');

  field.classList.toggle('is-invalid', !isValid);
  input.setAttribute('aria-invalid', String(!isValid));
  field.querySelector('.field__error').textContent = isValid ? '' : result;
  return isValid;
}

function resetFormErrors() {
  orderForm.querySelectorAll('.field').forEach((field) => {
    field.classList.remove('is-invalid');
    field.querySelector('.field__error').textContent = '';
    field.querySelector('.field__input').removeAttribute('aria-invalid');
  });
}

// Перепроверяем поле при вводе, если в нём уже была ошибка
orderForm.addEventListener('input', (event) => {
  const field = event.target.closest('.field');
  if (field && field.classList.contains('is-invalid')) {
    validateField(event.target);
  }
});

orderForm.addEventListener('focusout', (event) => {
  if (event.target.matches('.field__input') && event.target.value) {
    validateField(event.target);
  }
});

/* ===== Создание заказа ===== */
orderForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const inputs = [...orderForm.querySelectorAll('.field__input')];
  const firstInvalid = inputs.map(validateField).indexOf(false);

  if (firstInvalid !== -1) {
    inputs[firstInvalid].focus();
    return;
  }

  const data = Object.fromEntries(new FormData(orderForm));
  const orderNumber = String(Date.now()).slice(-6);

  orderSuccessText.textContent =
    `${data.firstName.trim()}, заказ №${orderNumber} на сумму ${formatPrice(getTotal())} принят. ` +
    `Мы позвоним по номеру ${data.phone.trim()} для подтверждения доставки.`;

  orderForm.hidden = true;
  orderSuccess.hidden = false;
  orderSuccess.querySelector('button').focus();

  orderForm.reset();
  resetFormErrors();
  clearCart();
});

/* ===== Старт ===== */
renderProducts();
renderCart();
