import { doc, onSnapshot, collection, getDocs, updateDoc, serverTimestamp } from
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { money, ensureAuth, ORDER_KEY, renderCartBadge, imgSrc } from "./store.js";

renderCartBadge();
const orderId = localStorage.getItem(ORDER_KEY);
const noOrder = document.getElementById("no-order"),
      orderBox = document.getElementById("order");

const FLOW = ["pendiente", "aprobada", "pagada", "en_preparacion", "lista", "entregada"];
const LBL = { pendiente: "Pendiente", aprobada: "Aprobada", pagada: "Pagada",
  en_preparacion: "En preparación", lista: "Lista", entregada: "Entregada" };

if (!orderId) { noOrder.hidden = false; } else {
  ensureAuth().then(() => {
    onSnapshot(doc(db, "orders", orderId), snap => {
      if (!snap.exists()) { noOrder.hidden = false; orderBox.hidden = true; return; }
      render(snap.data());
    }, err => { noOrder.hidden = false; });
  });
}

function render(o) {
  noOrder.hidden = true; orderBox.hidden = false;
  document.getElementById("o-code").textContent = `Pedido ${o.orderCode}`;

  // banner según estado
  const banner = document.getElementById("banner");
  if (o.status === "rechazada") {
    banner.innerHTML = `<div class="banner bad">❌ Pedido rechazado. ${o.adminNotes || ""}</div>`;
  } else if (o.paymentStatus === "rechazado") {
    banner.innerHTML = `<div class="banner bad">⚠️ El comprobante fue rechazado. Verifica el número/monto y envíalo de nuevo.</div>`;
  } else if (o.status === "pendiente") {
    banner.innerHTML = `<div class="banner ok">⏳ Tu pedido está pendiente de aprobación. Te avisamos por WhatsApp.</div>`;
  } else if (o.status === "aprobada" && o.paymentStatus !== "por_verificar") {
    banner.innerHTML = `<div class="banner ok">✅ ¡Pedido aprobado! Realiza tu pago abajo 👇</div>`;
  } else if (o.paymentStatus === "por_verificar") {
    banner.innerHTML = `<div class="banner ok">⏳ Comprobante enviado. Estamos verificando tu pago…</div>`;
  } else if (o.status === "lista") {
    banner.innerHTML = `<div class="banner ok">🎉 ¡Tu pedido está ${o.deliveryMethod === "domicilio" ? "en camino 🛵" : "listo para recoger 🏪"}!</div>`;
  } else if (o.status === "entregada") {
    banner.innerHTML = `<div class="banner ok">✅ Pedido entregado. ¡Gracias por comprar en Bodegón Simón! 💚</div>`;
  } else {
    banner.innerHTML = "";
  }

  // línea de tiempo
  const idx = FLOW.indexOf(o.status);
  document.getElementById("timeline").innerHTML = o.status === "rechazada"
    ? `<span class="pill s-rechazada">Rechazada</span>`
    : FLOW.map((s, i) =>
      `<span class="step ${i < idx ? "done" : ""} ${i === idx ? "current" : ""}">
        <span class="dot"></span>${LBL[s]}</span>`).join("");

  // resumen
  document.getElementById("o-summary").innerHTML = `
    ${o.items.map(i => `
      <div class="cart-row">
        <img src="${imgSrc(i)}">
        <div class="grow">${i.quantity} × <b>${i.name}</b>
          <br><small class="muted">${i.unit || ""}</small></div>
        <b>${money(i.subtotal)}</b>
      </div>`).join("")}
    <p style="margin-top:.6rem">Subtotal: <b>${money(o.subtotal)}</b></p>
    ${o.status !== "pendiente" ? `
      <p>Envío: <b>${money(o.deliveryFee)}</b>
        ${o.deliveryMethod === "domicilio" ? "(domicilio)" : "(recogida)"}</p>
      <p style="font-size:1.15rem">Total: <b>${money(o.total)}</b></p>` : ""}`;

  // panel de pago / info de pago
  const payPanel = document.getElementById("pay-panel"),
        payInfo = document.getElementById("pay-info");
  if (o.status === "aprobada" && o.paymentStatus !== "por_verificar") {
    document.getElementById("pay-total").textContent = money(o.total);
    document.getElementById("pm-amount").value = o.total.toFixed(2);
    loadAccounts();
    payPanel.hidden = false; payInfo.hidden = true;
  } else {
    payPanel.hidden = true;
    if (o.paymentRef) {
      payInfo.hidden = false;
      payInfo.innerHTML = `<h3>🧾 Pago reportado</h3>
        <p>Método: ${o.paymentMethod} · Banco: ${o.paymentBank}</p>
        <p>Referencia: <b>${o.paymentRef}</b> · Monto: ${money(o.paymentAmount)}</p>
        <p>Estado: <span class="pill ${o.paymentStatus === "verificado" ? "s-pagada" : "s-pendiente"}">
          ${o.paymentStatus === "verificado" ? "Verificado ✅" : "Por verificar ⏳"}</span></p>`;
    } else payInfo.hidden = true;
  }
}

async function loadAccounts() {
  const snap = await getDocs(collection(db, "paymentAccounts"));
  document.getElementById("accounts").innerHTML = snap.docs.filter(d => d.data().active)
    .map(d => { const a = d.data(); return `
      <div class="cart-row"><div class="grow">
        🏦 <b>${a.bank}</b> (${a.type === "pago_movil" ? "Pago Móvil" : "Transferencia"})<br>
        ${a.type === "pago_movil" ? "Telf: " + a.phone + " · " : ""}${a.accountNumber} · ${a.rif}<br>
        Titular: ${a.holder}</div></div>`; }).join("");
}

document.getElementById("pay-form").addEventListener("submit", async e => {
  e.preventDefault();
  const ref = document.getElementById("pm-ref").value.trim();
  if (ref.length < 4) return alert("Ingresa el número de referencia");
  try {
    await updateDoc(doc(db, "orders", orderId), {
      paymentMethod: document.getElementById("pm-method").value,
      paymentBank:   document.getElementById("pm-bank").value.trim(),
      paymentRef:    ref,
      paymentAmount: parseFloat(document.getElementById("pm-amount").value),
      paymentPaidAt: serverTimestamp(),
      paymentStatus: "por_verificar",
      updatedAt:     serverTimestamp()
    });
    alert("¡Comprobante enviado! Te avisaremos al confirmar el pago 🙌");
  } catch (err) {
    alert("No se pudo enviar: " + err.message);
  }
});