import { collection, doc, runTransaction, serverTimestamp, Timestamp } from
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db, auth } from "./firebase-config.js";
import { getCart, setQty, removeFromCart, cartTotals, clearCart,
         money, renderCartBadge, ensureAuth, imgSrc, genCode, ORDER_KEY } from "./store.js";

renderCartBadge();

const itemsList = document.getElementById("items-list"),
      coSubtotal = document.getElementById("co-subtotal"),
      form = document.getElementById("co-form");

function render() {
  const cart = getCart();
  if (!cart.length) {
    itemsList.innerHTML = `<p class="empty">Tu selección está vacía 🛒<br><br>
      <a class="btn" href="hacer-pedido.html">Elegir productos</a></p>`;
    form.style.display = "none";
    coSubtotal.textContent = "$0.00";
    return;
  }
  itemsList.innerHTML = cart.map(i => `
    <div class="cart-row">
      <img src="${imgSrc(i)}">
      <div class="grow"><b>${i.name}</b><br>
        <span class="muted">${money(i.price)} × ${i.quantity} ${i.unit}</span></div>
      <div class="qty">
        <button data-dec="${i.productId}">−</button><span>${i.quantity}</span>
        <button data-inc="${i.productId}">+</button>
      </div>
      <b>${money(i.subtotal)}</b>
      <button class="xlink" data-del="${i.productId}">✕</button>
    </div>`).join("");
  coSubtotal.textContent = money(cartTotals().subtotal);
}

itemsList.addEventListener("click", e => {
  const inc = e.target.closest("[data-inc]"), dec = e.target.closest("[data-dec]"),
        del = e.target.closest("[data-del]");
  if (inc) { const r = getCart().find(i => i.productId === inc.dataset.inc); setQty(r.productId, r.quantity + 1); }
  if (dec) { const r = getCart().find(i => i.productId === dec.dataset.dec);
             r.quantity <= 1 ? removeFromCart(r.productId) : setQty(r.productId, r.quantity - 1); }
  if (del) removeFromCart(del.dataset.del);
  render();
});

document.querySelectorAll('input[name="co-del"]').forEach(r =>
  r.onchange = () =>
    document.getElementById("addr-wrap").hidden =
      !document.querySelector('input[name="co-del"]:checked').matches('[value="domicilio"]'));

form.addEventListener("submit", async e => {
  e.preventDefault();
  const cart = getCart();
  if (!cart.length) return;

  const delivery = document.querySelector('input[name="co-del"]:checked').value;
  const address = document.getElementById("co-address").value.trim();
  if (delivery === "domicilio" && address.length < 8)
    return alert("Escribe la dirección de entrega (calle, casa, sector)");

  await ensureAuth();

  const { subtotal } = cartTotals();
  const dateVal = document.getElementById("co-date").value;
  const btn = form.querySelector("button.btn");
  btn.disabled = true; btn.textContent = "Procesando…";

  const order = {
    orderCode: genCode(),
    userId: auth.currentUser.uid,
    customer: {
      fullName: document.getElementById("co-name").value.trim(),
      idNumber: document.getElementById("co-id").value.trim(),
      cellphone: document.getElementById("co-phone").value.trim()
    },
    date: serverTimestamp(),
    requestedDate: dateVal ? Timestamp.fromDate(new Date(dateVal)) : null,
    items: cart,
    subtotal: subtotal,
    deliveryFee: 0,
    total: subtotal,
    deliveryMethod: delivery,
    address: delivery === "domicilio" ? address : "",
    paymentMethod: "", paymentBank: "", paymentRef: "",
    paymentAmount: 0, paymentPaidAt: null, paymentStatus: "",
    status: "pendiente",
    adminNotes: "",
    statusHistory: [{ status: "pendiente", changedBy: "cliente", at: serverTimestamp() }],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const orderRef = doc(collection(db, "orders"));   // ID se genera aquí

  try {
    await runTransaction(db, async (tx) => {
      // 1) cuánto necesita de cada producto
      const need = {};
      order.items.forEach(i => { need[i.productId] = (need[i.productId] || 0) + i.quantity; });

      // 2) validar stock de todos
      const snaps = {};
      for (const pid of Object.keys(need)) {
        const s = await tx.get(doc(db, "products", pid));
        if (!s.exists()) throw new Error("Un producto ya no está disponible. Quítalo del carrito.");
        const stock = s.data().stock ?? 0;
        if (stock < need[pid])
          throw new Error(`Stock insuficiente: ${s.data().name} (quedan ${stock}). Ajusta la cantidad.`);
        snaps[pid] = { ref: s.ref, stock };
      }

      // 3) descontar stock (el cliente "toma" el inventario al comprar)
      for (const { ref, stock } of Object.values(snaps)) {
        tx.update(ref, { stock: stock - need[pid], updatedAt: serverTimestamp() });
      }

      // 4) crear el pedido → aparece al instante en la app Python
      tx.set(orderRef, order);
    });

    localStorage.setItem(ORDER_KEY, orderRef.id);
    clearCart();
    alert(`¡Pedido enviado! 🎉\nTu código es: ${order.orderCode}`);
    location.href = "pedido.html";
  } catch (err) {
    alert("No se pudo enviar el pedido:\n" + err.message);
  } finally {
    btn.disabled = false; btn.textContent = "Enviar pedido ✅";
  }
});

render();