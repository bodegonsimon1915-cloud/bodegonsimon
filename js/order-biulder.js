import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { addToCart, money, renderCartBadge, toast, imgSrc } from "./store.js";

const grid = document.getElementById("grid"),
      chipsEl = document.getElementById("chips"),
      searchInput = document.getElementById("search"),
      sumItems = document.getElementById("sum-items"),
      sumSubtotal = document.getElementById("sum-subtotal"),
      btnClear = document.getElementById("btn-clear"),
      btnAddAll = document.getElementById("btn-add-all"),
      barCount = document.getElementById("bar-count"),
      barTotal = document.getElementById("bar-total"),
      barClear = document.getElementById("bar-clear"),
      barAdd = document.getElementById("bar-add");

const EMOJI = [["fruta","🥬"],["verdu","🥬"],["carn","🥩"],["poll","🍗"],["lact","🥛"],
  ["ques","🧀"],["pan","🥖"],["gran","🍚"],["arroz","🍚"],["enlat","🥫"],["atun","🥫"],
  ["bebid","🥤"],["jug","🧃"],["agua","💧"],["aseo","🧼"],["limp","🧽"],["snack","🍿"],
  ["galle","🍪"],["congel","🧊"],["mascot","🐾"],["licor","🍾"],["cafe","☕"]];
const emojiFor = c => { const s = (c || "").toLowerCase();
  return (EMOJI.find(([k]) => s.includes(k)) || [null, "🛍️"])[1]; };

let products = [], cat = "todos", q = "";

/* SELECCIÓN: { productId: cantidad } — independiente del carrito */
const sel = new Map();

const eff = p => (p.offerPrice && p.offerPrice < p.price) ? p.offerPrice : p.price;
const byId = id => products.find(p => p.id === id);
const selCount = () => sel.size;
const selUnits = () => [...sel.values()].reduce((a, b) => a + b, 0);
const selTotal = () => [...sel.entries()]
  .reduce((t, [id, qty]) => { const p = byId(id); return p ? t + eff(p) * qty : t; }, 0);

/* ── Datos en vivo ── */
onSnapshot(collection(db, "products"), snap => {
  products = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.available !== false);
  // limpiar selecciones de productos que ya no existen o quedaron sin stock
  for (const id of [...sel.keys()]) {
    const p = byId(id);
    if (!p || p.stock <= 0) sel.delete(id);
  }
  buildChips(); renderGrid(); renderSel();
}, err => { grid.innerHTML = `<p class="empty">⚠️ Error: ${err.message}</p>`; });

/* ── Pasillos ── */
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

/* ── Tarjeta seleccionable ── */
function cardHTML(p) {
  const E = eff(p), qty = sel.get(p.id) || 0, isSel = qty > 0;
  return `
  <article class="card ${isSel ? "selected" : ""}" data-card="${p.id}">
    <span class="sel-check">✓</span>
    ${p.offerPrice && p.offerPrice < p.price ? `<span class="tag-offer">OFERTA</span>` : ""}
    <img src="${imgSrc(p)}" alt="${p.name}">
    <h3>${p.name}</h3>
    <span class="unit">${p.unit || ""}${p.category ? " · " + p.category : ""}</span>
    <div class="row">
      <span class="price">${money(E)}</span>
      <span class="stock ${p.stock > 0 ? "ok" : "out"}">${p.stock > 0 ? "✓ " + p.stock : "Agotado"}</span>
    </div>
    ${p.stock > 0
      ? (isSel
        ? `<div class="stepper">
             <button type="button" data-dec="${p.id}">−</button>
             <span>${qty}</span>
             <button type="button" data-inc="${p.id}">+</button>
           </div>`
        : `<button type="button" class="btn pick" data-pick="${p.id}">＋ Seleccionar</button>`)
      : `<button class="btn" disabled>Agotado</button>`}
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

/* ── Interacción del grid ── */
grid.addEventListener("click", e => {
  const pick = e.target.closest("[data-pick]");
  const inc  = e.target.closest("[data-inc]");
  const dec  = e.target.closest("[data-dec]");
  const card = e.target.closest("[data-card]");

  // clic en steppers: no alternar selección
  if (inc) { const id = inc.dataset.inc, p = byId(id);
    if (p && (sel.get(id) || 0) < p.stock) sel.set(id, sel.get(id) + 1);
    else if (p) alert(`Stock disponible: ${p.stock}`);
    updateCard(id); renderSel(); return; }
  if (dec) { const id = dec.dataset.dec;
    const n = (sel.get(id) || 0) - 1;
    n <= 0 ? sel.delete(id) : sel.set(id, n);
    updateCard(id); renderSel(); return; }

  // seleccionar / deseleccionar
  if (card) {
    const id = card.dataset.card, p = byId(id);
    if (!p || p.stock <= 0) return;
    if (sel.has(id)) { sel.delete(id); }
    else { sel.set(id, 1); toast(`${p.name} seleccionado ✓`); }
    updateCard(id); renderSel();
  }
});

function updateCard(id) {
  const card = grid.querySelector(`[data-card="${id}"]`);
  const p = byId(id);
  if (!card || !p) return;
  card.outerHTML = cardHTML(p);
}

/* ── Panel lateral + barra inferior ── */
function renderSel() {
  const n = selCount(), total = selTotal();
  const disabled = n === 0;

  if (!n) {
    sumItems.innerHTML = `<p class="empty">Toca los productos de la izquierda<br>para marcarlos 👈</p>`;
  } else {
    sumItems.innerHTML = [...sel.entries()].map(([id, qty]) => {
      const p = byId(id); if (!p) return "";
      return `
      <div class="sum-row">
        <div class="grow"><b>${p.name}</b><br>
          <small class="muted">${money(eff(p))} × ${qty} = <b>${money(eff(p) * qty)}</b></small></div>
        <div class="qty">
          <button data-sdec="${id}">−</button><span>${qty}</span>
          <button data-sinc="${id}">+</button>
        </div>
        <button class="xlink" data-sdel="${id}">✕</button>
      </div>`;
    }).join("");
  }

  sumSubtotal.textContent = money(total);
  barCount.textContent = n
    ? `${n} producto${n > 1 ? "s" : ""} · ${selUnits()} unidad${selUnits() > 1 ? "es" : ""}`
    : "0 productos seleccionados";
  barTotal.textContent = money(total);
  btnAddAll.disabled = disabled;
  barAdd.disabled = disabled;
  btnAddAll.textContent = disabled ? "🛒 Agregar al carrito"
    : `🛒 Agregar ${selUnits()} al carrito`;
  barAdd.textContent = btnAddAll.textContent;
  renderCartBadge();
}

/* steppers del panel lateral */
sumItems.addEventListener("click", e => {
  const inc = e.target.closest("[data-sinc]"), dec = e.target.closest("[data-sdec]"),
        del = e.target.closest("[data-sdel]");
  if (inc) { const id = inc.dataset.sinc, p = byId(id);
    if (p && (sel.get(id) || 0) < p.stock) sel.set(id, sel.get(id) + 1);
    else if (p) alert(`Stock disponible: ${p.stock}`); }
  if (dec) { const id = dec.dataset.sdec;
    const n = (sel.get(id) || 0) - 1; n <= 0 ? sel.delete(id) : sel.set(id, n); }
  if (del) sel.delete(del.dataset.sdel);
  renderGrid(); renderSel();
});

/* ── AGREGAR TODOS AL CARRITO ── */
function agregarTodos() {
  if (!selCount()) return;
  let ok = 0, fail = [];
  for (const [id, qty] of sel.entries()) {
    const p = byId(id); if (!p) continue;
    if (addToCart(p, qty)) ok++; else fail.push(p.name);
  }
  sel.clear();
  renderGrid(); renderSel();
  if (ok && !fail) toast(`✅ ${ok} producto${ok > 1 ? "s" : ""} agregados al carrito`);
  if (ok && fail)  alert(`✅ ${ok} agregados.\n⚠️ Sin stock suficiente para: ${fail.join(", ")}`);
  if (!ok && fail) alert(`⚠️ Sin stock suficiente para: ${fail.join(", ")}`);
}
btnAddAll.onclick = agregarTodos;
barAdd.onclick = agregarTodos;

function limpiar() {
  if (!selCount()) return;
  if (confirm("¿Quitar todos los productos seleccionados?")) {
    sel.clear(); renderGrid(); renderSel();
  }
}
btnClear.onclick = limpiar;
barClear.onclick = limpiar;

/* ── Búsqueda ── */
searchInput.addEventListener("input", e => { q = e.target.value.toLowerCase(); renderGrid(); });

renderSel();
