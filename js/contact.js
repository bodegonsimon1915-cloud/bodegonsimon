import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { renderCartBadge } from "./store.js";

renderCartBadge();
const box = document.getElementById("info");
const snap = await getDoc(doc(db, "settings", "config"));
const c = snap.exists() ? snap.data() : {};

box.innerHTML = `
  <h3>${c.storeName || "Bodegón Simón"}</h3>
  <p style="margin:.6rem 0">📍 ${c.address || "Dirección de la bodega"}</p>
  <p style="margin:.6rem 0">🕒 ${c.hours || "Horario de atención"}</p>
  <p style="margin:.6rem 0">📞 ${c.phone || "Teléfono"}</p>
  ${c.whatsapp ? `<p style="margin-top:1rem">
    <a class="btn" style="background:#25d366;color:#06301b" target="_blank"
       href="https://wa.me/${String(c.whatsapp).replace(/\D/g, "")}">Escríbenos por WhatsApp 💬</a></p>` : ""}`;