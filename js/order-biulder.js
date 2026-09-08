import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { getCart, addToCart, setQty, removeFromCart, saveCart, cartTotals,
         money, renderCartBadge, toast, imgSrc } from "./store.js";

const grid = document.getElementById("grid"),
      chipsEl = document.getElementById("chips"),
      searchInput = document.getElementById("search"),
      sumItems = document.getElementById("sum-items"),
      sumSubtotal = document.getElementById("sum-subtotal"),
      btnClear = document.getElementById("btn-clear"),
      btnContinue = document.getElementById("btn-continue");

const EMOJI = [["fruta","🥬"],["verdu","🥬"],["carn","🥩"],["poll","🍗"],["lact","🥛"],
  ["ques","🧀"],["pan","🥖"],["gran","🍚"],["arroz","🍚"],["enlat","🥫"],["atun","🥫"],
  ["bebid","🥤"],["jug","🧃"],["agua","💧"],["aseo","🧼"],["limp","🧽"],["snack","🍿"],
  ["galle","🍪"],["congel","🧊"],["mascot","🐾"],["licor","🍾"],["cafe","☕"]];
const emojiFor = c => { const s = (c || "").toLowerCase();
  return (EMOJI.find(([k]) => s.includes(k)) || [null, "🛍️"])[1]; };

let products = [], cat = "todos", q = "";
const eff = p => (p.offerPrice && p.offerPrice < p.price) ? p.offerPrice : p.price;

onSnapshot(collection(db, "products"), snap => {
  products = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.available !== false);
  buildChips(); renderGrid(); renderSummary();
}, err => { grid.innerHTML = `<p class="empty">⚠️ Error: ${err.message}</p>`; });

function buildChips() {
  const counts = {};
  products.forEach(p => { if (p.category) counts[p.category] = (counts[p.category] || 0) + 1; });
  const cats = ["todos", ...Object.keys(counts).sort()];
  chipsEl.innerHTML = cats.map(c =>
    `<button class="chip ${c === cat ? "active" : ""}" data-cat="${c}">
       ${c === "todos" ? "🛒 Todo" : emojiFor(c) + " " + c}</button>`).join("");
}
chipsEl.addEventListener("click", e => {
  const b = e.target.closest("[data-cat]"); if (!b) return;
  cat = b.dataset.cat; buildChips(); renderGrid();
});

const qtyInCart = id => { const r = getCart().find(i => i.productId === id); return r ? r.quantity : 0; };

function cardHTML(p) {
  const inCart = qtyInCart(p.id);
  return `
  <article class="card ${inCart ? "in-cart" : ""}">
    ${p.offerPrice && p.offerPrice < p.price ? `<span class="tag-offer">OFERTA</span>` : ""}
    <img src="${imgSrc(p)}" alt="${p.name}">
    <h3>${p.name}</h3>
    <span class="unit">${p.unit || ""}${p.category ? " · " + p.category : ""}</span>
    <div class="row">
      <span class="price">${money(eff(p))}</span>
      <span class="stock ${p.stock > 0 ? "ok" : "out"}">${p.stock > 0 ? "✓ " + p.stock : "Agotado"}</span>
    </div>
    ${p.stock > 0 ? `
    <div class="stepper">
      <button data-dec="${p.id}" ${inCart ? "" : "disabled"}>−</button>
      <span>${inCart}</span>
      <button data-inc="${p.id}">+</button>
    </div>` : `<button class="btn" disabled>Agotado</button>`}
  </article>`;
}

function renderGrid() {
  const list = products
    .filter(p => (cat === "todos" || p.category === cat) &&
                 (p.name || "").toLowerCase().includes(q))
    .sort((a, b) => (b.stock > 0) - (a.stock > 0) || (a.name || "").localeCompare(b.name || ""));
  grid.innerHTML = list.length ? list.map(cardHTML).join("")
    : `<p class="empty">${products.length ? "Sin resultados 🤔" : "Aún no hay productos"}</p>`;
}

grid.addEventListener("click", e => {
  const inc = e.target.closest("[data-inc]"), dec = e.target.closest("[data-dec]");
  if (inc) {
    const p = products.find(x => x.id === inc.dataset.inc);
    if (p && addToCart(p, 1)) { refresh(inc); toast(`+1 ${p.name}`); }
  }
  if (dec) {
    const p = products.find(x => x.id === dec.dataset.dec);
    const cur = qtyInCart(p.id);
    if (cur <= 1) removeFromCart(p.id); else setQty(p.id, cur - 1);
    refresh(dec);
  }
});

function refresh(btn) {
  const card = btn.closest(".card");
  const pid = btn.dataset.inc || btn.dataset.dec;
  const inCart = qtyInCart(pid);
  card.classList.toggle("in-cart", inCart > 0);
  card.querySelector(".stepper span").textContent = inCart;
  card.querySelector("[data-dec]").disabled = inCart === 0;
  renderSummary();
}

function renderSummary() {
  const cart = getCart();
  if (!cart.length) {
    sumItems.innerHTML = `<p class="empty">Aún no agregas productos.<br>Toca <b>+</b> en cualquier tarjeta 👈</p>`;
    btnContinue.style.pointerEvents = "none"; btnContinue.style.opacity = ".5";
  } else {
    sumItems.innerHTML = cart.map(i => `
      <div class="sum-row">
        <div class="grow"><b>${i.name}</b><br>
          <small class="muted">${money(i.price)} × ${i.quantity}</small></div>
        <div class="qty">
          <button data-sdec="${i.productId}">−</button><span>${i.quantity}</span>
          <button data-sinc="${i.productId}">+</button>
        </div>
        <b>${money(i.subtotal)}</b>
        <button class="xlink" data-sdel="${i.productId}">✕</button>
      </div>`).join("");
    btnContinue.style.pointerEvents = ""; btnContinue.style.opacity = "1";
  }
  sumSubtotal.textContent = money(cartTotals().subtotal);
  renderCartBadge();
}

sumItems.addEventListener("click", e => {
  const inc = e.target.closest("[data-sinc]"), dec = e.target.closest("[data-sdec]"),
        del = e.target.closest("[data-sdel]");
  const stockOf = id => products.find(p => p.id === id)?.stock ?? 99;
  if (inc) {
    const r = getCart().find(i => i.productId === inc.dataset.sinc);
    if (r && r.quantity + 1 <= stockOf(r.productId)) setQty(r.productId, r.quantity + 1);
    else alert(`Stock disponible: ${stockOf(r.productId)}`);
    renderGrid(); renderSummary();
  }
  if (dec) {
    const r = getCart().find(i => i.productId === dec.dataset.sdec);
    if (r.quantity <= 1) removeFromCart(r.productId); else setQty(r.productId, r.quantity - 1);
    renderGrid(); renderSummary();
  }
  if (del) { removeFromCart(del.dataset.sdel); renderGrid(); renderSummary(); }
});

btnClear.onclick = () => {
  if (getCart().length && confirm("¿Vaciar tu pedido?")) {
    saveCart([]); renderGrid(); renderSummary();
  }
};

searchInput.addEventListener("input", e => { q = e.target.value.toLowerCase(); renderGrid(); });
renderSummary();