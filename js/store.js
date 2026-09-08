import { auth } from "./firebase-config.js";
import { signInAnonymously, onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

export const CART_KEY = "bodegon_cart";
export const ORDER_KEY = "bodegon_orderId";
export const money = n => `$${(Number(n) || 0).toFixed(2)}`;

/* Foto del producto: image64 (base64 en Firestore) → URL → placeholder */
export const PLACEHOLDER = "https://placehold.co/400x300/eef3ef/9bb8a5?text=%F0%9F%9B%92";
export const imgSrc = p => p.image64 || p.image || PLACEHOLDER;

export const getCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } };
export const saveCart = c => { localStorage.setItem(CART_KEY, JSON.stringify(c)); renderCartBadge(); };
export const clearCart = () => { localStorage.removeItem(CART_KEY); renderCartBadge(); };

export function addToCart(p, qty = 1) {
  const cart = getCart();
  const row = cart.find(i => i.productId === p.id);
  const cur = row ? row.quantity : 0;
  if (cur + qty > (p.stock ?? 0)) { alert(`Stock disponible: ${p.stock ?? 0}`); return false; }
  if (row) row.quantity += qty;
  else cart.push({ productId: p.id, name: p.name, price: p.price, unit: p.unit || "",
                   image: p.image || "", image64: p.image64 || "",
                   quantity: qty, subtotal: 0 });
  saveCart(cart.map(i => ({ ...i, subtotal: +(i.price * i.quantity).toFixed(2) })));
  return true;
}

export function setQty(id, qty) {
  const cart = getCart(); const row = cart.find(i => i.productId === id);
  if (!row) return; row.quantity = Math.max(1, qty);
  saveCart(cart.map(i => ({ ...i, subtotal: +(i.price * i.quantity).toFixed(2) })));
}
export const removeFromCart = id => saveCart(getCart().filter(i => i.productId !== id));

export const cartTotals = () => { const c = getCart(); return {
  count: c.reduce((s, i) => s + i.quantity, 0),
  subtotal: +c.reduce((s, i) => s + i.subtotal, 0).toFixed(2) }; };

export function renderCartBadge() {
  const t = cartTotals();
  const count = document.getElementById("cart-count");
  const total = document.getElementById("cart-total");
  if (count) count.textContent = t.count;
  if (total) total.textContent = money(t.subtotal);
}

export function ensureAuth() {
  return new Promise(res => {
    if (auth.currentUser) return res(auth.currentUser);
    onAuthStateChanged(auth, u => u && res(u));
    signInAnonymously(auth).catch(console.error);
  });
}

export function toast(msg) {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

export const genCode = () => "BDG-" + Math.random().toString(36).slice(2, 6).toUpperCase();