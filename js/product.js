import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { addToCart, money, renderCartBadge, toast, imgSrc } from "./store.js";

const id = new URLSearchParams(location.search).get("id");
const box = document.getElementById("detail");
renderCartBadge();

const snap = await getDoc(doc(db, "products", id));
if (!snap.exists()) { box.innerHTML = `<p class="empty">Producto no encontrado.</p>`; throw new Error("no existe"); }
const p = { id: snap.id, ...snap.data() };
const eff = (p.offerPrice && p.offerPrice < p.price) ? p.offerPrice : p.price;

box.innerHTML = `
  <div class="checkout">
    <div style="position:relative">
      ${eff < p.price ? `<span class="tag-offer">OFERTA</span>` : ""}
      <img src="${imgSrc(p)}" style="width:100%;border-radius:14px;object-fit:cover;max-height:360px">
    </div>
    <div>
      <span class="pill s-pagada">${p.category || "Producto"}</span>
      <h1 style="margin:.6rem 0 .2rem">${p.name}</h1>
      <p class="muted">Se vende por: ${p.unit || "unidad"}</p>
      <p style="margin:.8rem 0">${p.description || ""}</p>
      <p style="margin:.6rem 0">
        ${eff < p.price ? `<span class="old-price" style="font-size:1rem">${money(p.price)}</span>` : ""}
        <span class="price" style="font-size:1.7rem">${money(eff)}</span>
        <span class="muted"> / ${p.unit || "unidad"}</span></p>
      <p class="stock ${p.stock > 0 ? "ok" : "out"}" style="font-size:.95rem;margin:.4rem 0">
        ${p.stock > 0 ? "✓ Disponible: " + p.stock : "✗ Agotado temporalmente"}</p>
      <div class="qty" style="margin:1rem 0">
        <button id="minus">−</button>
        <span id="qty" style="min-width:2rem;text-align:center;font-weight:700">1</span>
        <button id="plus">+</button>
      </div>
      <button id="add" class="btn big" ${p.stock > 0 ? "" : "disabled"}>Agregar al carrito 🛒</button>
    </div>
  </div>`;

let qty = 1;
box.querySelector("#minus").onclick = () => { qty = Math.max(1, qty - 1); box.querySelector("#qty").textContent = qty; };
box.querySelector("#plus").onclick  = () => { qty++; box.querySelector("#qty").textContent = qty; };
box.querySelector("#add").onclick = () => {
  if (addToCart({ ...p, price: eff }, qty)) {
    toast("Agregado al carrito ✓");
    setTimeout(() => location.href = "carrito.html", 700);
  }
};