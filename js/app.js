const STORAGE_MENU = "nila-menu";
const STORAGE_SALES = "nila-sales";
const UPI_ID = "rafahmandhi@upi";
const GST_RATE = 0.00;

const DEFAULT_MENU = [
  { id: "m1", name: "Chicken Mandhi ", price: 250, category: "Mandhi", image: "images/chicken-mandhi.jpg" },
  { id: "m2", name: "Chicken Biryani", price: 130, category: "Biryani", image: "images/chicken-biryani.jpg" },
  { id: "m3", name: "Egg Biryani", price: 100, category: "Biryani", image: "images/egg-biryani.jpg" },
  { id: "m4", name: "Fish Sappadu", price: 140, category: "Meals", image: "images/fish-sappadu.jpg" },
  { id: "m5", name: "Pulav rice + Kalari Kari + chicken 65 + Raita", price: 170, category: "Curry", image: "images/kalari-kari.jpg" },
  { id: "m6", name: "Nei Soru + chicken Gravy +  65 + Raita ", price: 180, category: "Curry", image: "images/nei-soru.jpg" }
];

let menu = load(STORAGE_MENU, DEFAULT_MENU);
let sales = load(STORAGE_SALES, []);
let cart = [];
let customerName = "";

const $ = (id) => document.getElementById(id);

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : structuredClone(fallback);
  } catch {
    return structuredClone(fallback);
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function money(n) {
  return "₹" + Math.round(n);
}

function totals() {
  const subtotal = cart.reduce((sum, line) => sum + line.price * line.qty, 0);
  const gst = subtotal * GST_RATE;
  return { subtotal, gst, total: subtotal + gst };
}

function renderMenu() {
  const q = $("searchInput").value.trim().toLowerCase();
  const list = menu.filter((item) => item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q));
  $("menuGrid").innerHTML = list.map((item) => `
    <button class="dish" type="button" data-add="${item.id}">
      <img src="${item.image}" alt="${item.name}" onerror="this.src='images/chicken-mandhi.jpg'" />
      <div class="dish-body">
        <h3>${item.name}</h3>
        <p>${item.category}</p>
        <div class="price">${money(item.price)}</div>
      </div>
    </button>
  `).join("") || `<p class="empty">No dishes found. Add some from Manage menu.</p>`;
}

function renderCart() {
  $("cartCount").textContent = cart.reduce((n, l) => n + l.qty, 0);
  if (!cart.length) {
    $("cartItems").innerHTML = `<p class="empty">Cart is empty. Tap a dish to add it.</p>`;
  } else {
    $("cartItems").innerHTML = cart.map((line) => `
      <div class="cart-line">
        <div>
          <strong>${line.name}</strong>
          <div>${money(line.price)} each</div>
        </div>
        <div>
          <div class="qty">
            <button type="button" data-dec="${line.id}">−</button>
            <span>${line.qty}</span>
            <button type="button" data-inc="${line.id}">+</button>
          </div>
          <div>${money(line.price * line.qty)}</div>
        </div>
      </div>
    `).join("");
  }
  const t = totals();
  $("subtotal").textContent = money(t.subtotal);
  $("gst").textContent = money(t.gst);
  $("grandTotal").textContent = money(t.total);
}

function renderNameTag() {
  const tag = $("nameTag");
  if (customerName) {
    tag.hidden = false;
    tag.textContent = customerName;
  } else {
    tag.hidden = true;
  }
}

function addToCart(id) {
  const item = menu.find((m) => m.id === id);
  if (!item) return;
  const line = cart.find((c) => c.id === id);
  if (line) line.qty += 1;
  else cart.push({ id: item.id, name: item.name, price: item.price, qty: 1 });
  renderCart();
  if (window.matchMedia("(max-width: 900px)").matches) {
    $("billPane").classList.add("open");
  }
}

function changeQty(id, delta) {
  const line = cart.find((c) => c.id === id);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) cart = cart.filter((c) => c.id !== id);
  renderCart();
}

function openModal(id) {
  $("overlay").hidden = false;
  $(id).hidden = false;
}

function closeModals() {
  $("overlay").hidden = true;
  ["payModal", "salesModal", "manageModal"].forEach((id) => ($(id).hidden = true));
}

function requireBill() {
  if (!cart.length) {
    alert("Add items to the cart first.");
    return false;
  }
  if (!customerName) {
    alert("Add a customer name tag first.");
    $("customerName").focus();
    return false;
  }
  return true;
}

function payNow() {
  if (!requireBill()) return;
  const t = totals();
  const note = encodeURIComponent("RAFAH Mandhi & Briyani");
  const upi = `upi://pay?pa=${UPI_ID}&pn=${note}&am=${t.total.toFixed(2)}&cu=INR`;
  $("payMeta").textContent = `${customerName} · ${money(t.total)}`;
  $("qrImage").src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upi)}`;
  openModal("payModal");
}

function markPaid() {
  const t = totals();
  sales.push({
    id: "s" + Date.now(),
    date: new Date().toISOString(),
    customer: customerName,
    items: cart.map((l) => ({ name: l.name, qty: l.qty, price: l.price })),
    total: t.total
  });
  save(STORAGE_SALES, sales);
  closeModals();
  printBill(true);
  clearCart(false);
  alert("Payment recorded.");
}

function printBill(afterPay) {
  if (!afterPay && !requireBill()) return;
  const t = totals();
  const when = new Date().toLocaleString();
  $("printSheet").innerHTML = `
    <h2>Rafah Mandhi Briyani</h2>
    <p>Mandhi · Biryani · Meals</p>
    <p>Customer: <strong>${customerName || "Guest"}</strong></p>
    <p>${when}</p>
    <hr />
    ${cart.map((l) => `<p>${l.name} × ${l.qty} — ${money(l.price * l.qty)}</p>`).join("")}
    <hr />
    <p>Subtotal ${money(t.subtotal)}</p>
    <p>GST 0% ${money(t.gst)}</p>
    <p><strong>Total ${money(t.total)}</strong></p>
    <p>Thank you. Visit again.</p>
  `;
  window.print();
}

function clearCart(confirmFirst) {
  if (confirmFirst && cart.length && !confirm("Clear the cart?")) return;
  cart = [];
  renderCart();
}

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function renderSales() {
  const month = $("salesMonth").value || currentMonthValue();
  $("salesMonth").value = month;
  const rows = sales.filter((s) => s.date.slice(0, 7) === month);
  const bills = rows.length;
  const amount = rows.reduce((n, s) => n + s.total, 0);
  $("salesSummary").innerHTML = `
    <div><span>Bills</span><strong>${bills}</strong></div>
    <div><span>Total sales</span><strong>${money(amount)}</strong></div>
  `;
  $("salesRows").innerHTML = rows.slice().reverse().map((s) => `
    <tr>
      <td>${new Date(s.date).toLocaleString()}</td>
      <td>${s.customer}</td>
      <td>${s.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}</td>
      <td>${money(s.total)}</td>
    </tr>
  `).join("") || `<tr><td colspan="4">No sales this month.</td></tr>`;
}

function renderManage() {
  $("manageRows").innerHTML = menu.map((item) => `
    <tr>
      <td>${item.name}<br /><small>${item.category}</small></td>
      <td>${money(item.price)}</td>
      <td>
        <button class="tiny" type="button" data-edit="${item.id}">Edit</button>
        <button class="tiny danger" type="button" data-del="${item.id}">Delete</button>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="3">Menu is empty.</td></tr>`;
}

function resetForm() {
  $("menuForm").reset();
  $("itemId").value = "";
  $("saveItemBtn").textContent = "Add dish";
}

function saveItem(e) {
  e.preventDefault();
  const id = $("itemId").value || "m" + Date.now();
  const next = {
    id,
    name: $("itemName").value.trim(),
    price: Number($("itemPrice").value),
    category: $("itemCategory").value.trim() || "Special",
    image: $("itemImage").value.trim() || "images/chicken-mandhi.jpg"
  };
  const idx = menu.findIndex((m) => m.id === id);
  if (idx >= 0) menu[idx] = next;
  else menu.push(next);
  save(STORAGE_MENU, menu);
  renderMenu();
  renderManage();
  resetForm();
}

function editItem(id) {
  const item = menu.find((m) => m.id === id);
  if (!item) return;
  $("itemId").value = item.id;
  $("itemName").value = item.name;
  $("itemPrice").value = item.price;
  $("itemCategory").value = item.category;
  $("itemImage").value = item.image;
  $("saveItemBtn").textContent = "Update dish";
}

function deleteItem(id) {
  if (!confirm("Delete this dish?")) return;
  menu = menu.filter((m) => m.id !== id);
  cart = cart.filter((c) => c.id !== id);
  save(STORAGE_MENU, menu);
  renderMenu();
  renderManage();
  renderCart();
}

document.addEventListener("click", (e) => {
  const add = e.target.closest("[data-add]");
  if (add) addToCart(add.dataset.add);
  const inc = e.target.closest("[data-inc]");
  if (inc) changeQty(inc.dataset.inc, 1);
  const dec = e.target.closest("[data-dec]");
  if (dec) changeQty(dec.dataset.dec, -1);
  const edit = e.target.closest("[data-edit]");
  if (edit) editItem(edit.dataset.edit);
  const del = e.target.closest("[data-del]");
  if (del) deleteItem(del.dataset.del);
});

$("searchInput").addEventListener("input", renderMenu);
function setCustomerName(value) {
  customerName = value.trim();
  $("customerName").value = value;
  renderNameTag();
}

$("customerName").addEventListener("input", (e) => setCustomerName(e.target.value));
$("customerName").addEventListener("change", (e) => setCustomerName(e.target.value));
$("payBtn").addEventListener("click", payNow);
$("printBtn").addEventListener("click", () => printBill(false));
$("clearBtn").addEventListener("click", () => clearCart(true));
$("markPaidBtn").addEventListener("click", markPaid);
$("closePayBtn").addEventListener("click", closeModals);
$("salesBtn").addEventListener("click", () => { renderSales(); openModal("salesModal"); });
$("closeSalesBtn").addEventListener("click", closeModals);
$("salesMonth").addEventListener("change", renderSales);
$("manageBtn").addEventListener("click", () => { renderManage(); openModal("manageModal"); });
$("closeManageBtn").addEventListener("click", closeModals);
$("menuForm").addEventListener("submit", saveItem);
$("resetFormBtn").addEventListener("click", resetForm);
$("overlay").addEventListener("click", closeModals);
$("cartToggle").addEventListener("click", () => $("billPane").classList.add("open"));
$("closeCart").addEventListener("click", () => $("billPane").classList.remove("open"));

renderMenu();
renderCart();
renderNameTag();
