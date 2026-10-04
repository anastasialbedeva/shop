'use strict';

/* ===== Константы и элементы страницы ===== */
const STORAGE_KEY = 'green-shelf-cart';
const MAX_QTY = 99;

const productsEl = document.getElementById('products');
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

/* ===== Состояние корзины ===== */
// Корзина — массив объектов { id, name, price, icon, qty }
let cart = loadCart();

function loadCart() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(data)) return [];
    return data.filter(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        Number.isFinite(item.price) &&
        Number.isInteger(item.qty) &&
        item.qty > 0
    );
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

/* ===== Вспомогательные функции ===== */
function formatPrice(value) {
  return `${value.toLocaleString('ru-RU')} ₽`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function getTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function getCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

let toastTimer;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2000);
}

/* ===== Операции с корзиной ===== */
function addToCart(product) {
  const item = cart.find((i) => i.id === product.id);
  if (item) {
    item.qty = Math.min(item.qty + 1, MAX_QTY);
  } else {
    cart.push({ ...product, qty: 1 });
  }
  updateCart();
  bumpCounter();
}

function removeFromCart(id) {
  const item = cart.find((i) => i.id === id);
  cart = cart.filter((i) => i.id !== id);
  updateCart();
  if (item) showToast(`«${item.name}» удалён из корзины`);
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

/* ===== Отрисовка корзины ===== */
function renderCart() {
  const total = getTotal();
  const isEmpty = cart.length === 0;

  cartCountEl.textContent = getCount();
  cartTotalEl.textContent = formatPrice(total);
  cartEmptyEl.hidden = !isEmpty;
  cartListEl.hidden = isEmpty;
  checkoutBtn.disabled = isEmpty;
  clearBtn.disabled = isEmpty;

  cartListEl.innerHTML = cart
    .map(
      (item) => `
      <li class="cart-item" data-id="${escapeHtml(item.id)}">
        <span class="cart-item__icon" aria-hidden="true">${escapeHtml(item.icon || '🌿')}</span>
        <div class="cart-item__info">
          <p class="cart-item__name">${escapeHtml(item.name)}</p>
          <p class="cart-item__price">${formatPrice(item.price)} за шт.</p>
        </div>
        <button class="cart-item__remove" type="button" data-action="remove"
                aria-label="Удалить ${escapeHtml(item.name)} из корзины">✕</button>
        <div class="qty">
          <button class="qty__btn" type="button" data-action="dec"
                  aria-label="Уменьшить количество" ${item.qty <= 1 ? 'disabled' : ''}>−</button>
          <input class="qty__input" type="number" min="1" max="${MAX_QTY}"
                 value="${item.qty}" aria-label="Количество: ${escapeHtml(item.name)}">
          <button class="qty__btn" type="button" data-action="inc"
                  aria-label="Увеличить количество" ${item.qty >= MAX_QTY ? 'disabled' : ''}>+</button>
        </div>
        <p class="cart-item__sum">${formatPrice(item.price * item.qty)}</p>
      </li>`
    )
    .join('');
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

  const card = button.closest('.card');
  const product = {
    id: card.dataset.id,
    name: card.dataset.name,
    price: Number(card.dataset.price),
    icon: card.dataset.icon,
  };

  addToCart(product);
  showToast(`«${product.name}» добавлен в корзину`);

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
  if (confirm('Удалить все товары из корзины?')) {
    clearCart();
    showToast('Корзина очищена');
  }
});

// Синхронизация корзины между вкладками
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) {
    cart = loadCart();
    renderCart();
  }
});

/* ===== Модальное окно ===== */
function openOrderModal() {
  if (cart.length === 0) return;
  orderForm.hidden = false;
  orderSuccess.hidden = true;
  orderTotalEl.textContent = formatPrice(getTotal());
  modal.showModal();
  orderForm.querySelector('input').focus();
}

checkoutBtn.addEventListener('click', openOrderModal);

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
  const validate = validators[input.name];
  if (!validate) return true;

  const result = validate(input.value);
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
  });
  orderForm.querySelectorAll('.field__input').forEach((input) => input.removeAttribute('aria-invalid'));
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
  const results = inputs.map(validateField);
  const firstInvalid = results.indexOf(false);

  if (firstInvalid !== -1) {
    inputs[firstInvalid].focus();
    return;
  }

  if (cart.length === 0) {
    modal.close();
    return;
  }

  const data = Object.fromEntries(new FormData(orderForm));
  const total = getTotal();
  const orderNumber = String(Date.now()).slice(-6);

  orderSuccessText.textContent =
    `${data.firstName.trim()}, заказ №${orderNumber} на сумму ${formatPrice(total)} принят. ` +
    `Мы позвоним по номеру ${data.phone.trim()} для подтверждения доставки.`;

  orderForm.hidden = true;
  orderSuccess.hidden = false;
  orderSuccess.querySelector('button').focus();

  orderForm.reset();
  resetFormErrors();
  clearCart();
});

/* ===== Старт ===== */
renderCart();
