/* ===================================================================
   RE-TECH — script.js
   Full site logic + Firebase Firestore integration
=================================================================== */
 
import {
  db,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  auth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "./firebase.js";
 
/* ===================================================================
   STATE
=================================================================== */
let products = [];
let sellRequests = [];
let orders = [];
 
let typeFilter = "all";
let conditionFilter = "all";
 
let currentOrderProduct = null;
let pendingImageData = null;
 
/* ===================================================================
   DOM REFS
=================================================================== */
const mainNav = document.getElementById("mainNav");
const menuToggle = document.getElementById("menuToggle");
 
const homeFeaturedGrid = document.getElementById("homeFeaturedGrid");
 
const searchInput = document.getElementById("searchInput");
const resultCount = document.getElementById("resultCount");
const buyGrid = document.getElementById("buyGrid");
 
const sellForm = document.getElementById("sellForm");
 
const dashLogin = document.getElementById("dashLogin");
const dashLoginForm = document.getElementById("dashLoginForm");
const dashEmail = document.getElementById("dashEmail");
const dashPassword = document.getElementById("dashPassword");
const dashError = document.getElementById("dashError");
const dashContent = document.getElementById("dashContent");
const dashLogout = document.getElementById("dashLogout");
 
const statGadgets = document.getElementById("statGadgets");
const statSell = document.getElementById("statSell");
const statOrders = document.getElementById("statOrders");
 
const addGadgetForm = document.getElementById("addGadgetForm");
const gImageInput = document.getElementById("gImage");
const gImagePreviewWrap = document.getElementById("gImagePreviewWrap");
const gImagePreview = document.getElementById("gImagePreview");
const gImageRemove = document.getElementById("gImageRemove");
 
const gadgetsTableBody = document.getElementById("gadgetsTableBody");
const gadgetsEmpty = document.getElementById("gadgetsEmpty");
const sellTableBody = document.getElementById("sellTableBody");
const sellEmpty = document.getElementById("sellEmpty");
const ordersTableBody = document.getElementById("ordersTableBody");
const ordersEmpty = document.getElementById("ordersEmpty");
 
const orderModalOverlay = document.getElementById("orderModalOverlay");
const orderModalClose = document.getElementById("orderModalClose");
const modalProductLine = document.getElementById("modalProductLine");
const orderForm = document.getElementById("orderForm");
 
const toast = document.getElementById("toast");
 
/* ===================================================================
   ROUTER
=================================================================== */
function navigateTo(pageName) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const target = document.getElementById("page-" + pageName);
  if (target) target.classList.add("active");
 
  document.querySelectorAll(".nav-link").forEach(link => {
    link.classList.toggle("active", link.dataset.nav === pageName);
  });
 
  mainNav.classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
 
document.querySelectorAll("[data-nav]").forEach(el => {
  el.addEventListener("click", e => {
    e.preventDefault();
    navigateTo(el.dataset.nav);
  });
});
 
menuToggle.addEventListener("click", () => {
  mainNav.classList.toggle("open");
});
 
/* ===================================================================
   TOAST
=================================================================== */
let toastTimer = null;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
 
/* ===================================================================
   PRODUCT CARD BUILDER
=================================================================== */
function conditionPillClass(condition) {
  if (condition === "Like New") return "pill-cond-1";
  if (condition === "Excellent") return "pill-cond-2";
  return "pill-cond-3";
}
 
function deviceIconSVG() {
  return `<svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1">
    <rect x="3" y="4" width="13" height="9" rx="1"/><path d="M1 16h17l-1.4 2H2.4z"/>
    <rect x="16.5" y="7" width="6.5" height="12" rx="1.4"/>
  </svg>`;
}
 
function buildProductCard(p) {
  const card = document.createElement("div");
  card.className = "product-card";
 
  const specs = Array.isArray(p.specs) ? p.specs : [];
  const price = Number(p.price) || 0;
 
  card.innerHTML = `
    <div class="card-media">
      ${p.image ? `<img src="${p.image}" alt="${escapeHTML(p.title || "")}">` : deviceIconSVG()}
      <div class="card-pills">
        <span class="pill ${conditionPillClass(p.condition)}">${escapeHTML(p.condition || "")}</span>
      </div>
    </div>
    <div class="card-body">
      <span class="card-brand">${escapeHTML(p.brand || "")}</span>
      <h3 class="card-title">${escapeHTML(p.title || "")}</h3>
      <div class="card-specs">
        ${specs.map(s => `<span>${escapeHTML(s)}</span>`).join("")}
        ${p.battery ? `<span>${escapeHTML(String(p.battery))}% battery</span>` : ""}
      </div>
      <div class="card-price-row">
        <span class="card-price">₹${price.toLocaleString("en-IN")}</span>
      </div>
      <div class="card-actions">
        <a href="tel:+919876543210" class="btn btn-call">Call</a>
        <button type="button" class="btn btn-order" data-order-btn>Order Now</button>
      </div>
    </div>
  `;
 
  card.querySelector("[data-order-btn]").addEventListener("click", () => openOrderModal(p));
 
  return card;
}
 
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
 
/* ===================================================================
   HOME — FEATURED GRID
=================================================================== */
function renderHomeFeatured() {
  homeFeaturedGrid.innerHTML = "";
  const featured = products.slice(0, 3);
 
  if (featured.length === 0) {
    homeFeaturedGrid.innerHTML = `<p style="color:var(--muted);grid-column:1/-1;padding:20px 0;">No devices listed yet.</p>`;
    return;
  }
 
  const frag = document.createDocumentFragment();
  featured.forEach(p => frag.appendChild(buildProductCard(p)));
  homeFeaturedGrid.appendChild(frag);
}
 
/* ===================================================================
   BUY TECH — GRID + FILTERS + SEARCH
=================================================================== */
function renderBuyGrid() {
  const q = (searchInput.value || "").trim().toLowerCase();
 
  const list = products.filter(p => {
    const matchesType = typeFilter === "all" || p.type === typeFilter;
    const matchesCondition = conditionFilter === "all" || p.condition === conditionFilter;
 
    const haystack = (
      (p.title || "") + " " +
      (p.brand || "") + " " +
      ((p.specs || []).join(" "))
    ).toLowerCase();
 
    const matchesSearch = q === "" || haystack.includes(q);
 
    return matchesType && matchesCondition && matchesSearch;
  });
 
  resultCount.textContent = `Showing ${list.length} of ${products.length} certified items`;
 
  buyGrid.innerHTML = "";
 
  if (list.length === 0) {
    buyGrid.innerHTML = `<p style="color:var(--muted);grid-column:1/-1;padding:30px 0;text-align:center;">No devices match your search.</p>`;
    return;
  }
 
  const frag = document.createDocumentFragment();
  list.forEach(p => frag.appendChild(buildProductCard(p)));
  buyGrid.appendChild(frag);
}
 
document.querySelectorAll(".chip[data-type]").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip[data-type]").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    typeFilter = chip.dataset.type;
    renderBuyGrid();
  });
});
 
document.querySelectorAll(".chip[data-condition]").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip[data-condition]").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    conditionFilter = chip.dataset.condition;
    renderBuyGrid();
  });
});
 
searchInput.addEventListener("input", renderBuyGrid);
 
/* ===================================================================
   SELL FORM
=================================================================== */
sellForm.addEventListener("submit", async e => {
  e.preventDefault();
 
  const payload = {
    type: document.getElementById("sellType").value,
    brandModel: document.getElementById("sellBrandModel").value.trim(),
    condition: document.getElementById("sellCondition").value,
    price: Number(document.getElementById("sellPrice").value) || 0,
    name: document.getElementById("sellName").value.trim(),
    phone: document.getElementById("sellPhone").value.trim(),
    email: document.getElementById("sellEmail").value.trim(),
    createdAt: serverTimestamp()
  };
 
  try {
    await addDoc(collection(db, "sellRequests"), payload);
    sellForm.reset();
    showToast("Device submitted! We'll call you shortly.");
    navigateTo("home");
  } catch (err) {
    console.error(err);
    showToast("Something went wrong. Please try again.");
  }
});
 
/* ===================================================================
   ORDER MODAL
=================================================================== */
function openOrderModal(product) {
  currentOrderProduct = product;
  modalProductLine.textContent = `${product.title} — ₹${Number(product.price || 0).toLocaleString("en-IN")}`;
  orderModalOverlay.classList.add("open");
}
 
function closeOrderModal() {
  orderModalOverlay.classList.remove("open");
  currentOrderProduct = null;
  orderForm.reset();
}
 
orderModalClose.addEventListener("click", closeOrderModal);
orderModalOverlay.addEventListener("click", e => {
  if (e.target === orderModalOverlay) closeOrderModal();
});
 
orderForm.addEventListener("submit", async e => {
  e.preventDefault();
  if (!currentOrderProduct) return;
 
  const payload = {
    productId: currentOrderProduct.id,
    productTitle: currentOrderProduct.title,
    price: Number(currentOrderProduct.price) || 0,
    name: document.getElementById("orderName").value.trim(),
    phone: document.getElementById("orderPhone").value.trim(),
    email: document.getElementById("orderEmail").value.trim(),
    createdAt: serverTimestamp()
  };
 
  try {
    await addDoc(collection(db, "orders"), payload);
    showToast("Order placed! We'll contact you soon.");
    closeOrderModal();
  } catch (err) {
    console.error(err);
    showToast("Something went wrong. Please try again.");
  }
});
 
/* ===================================================================
   DASHBOARD — LOGIN / LOGOUT
=================================================================== */
function showDashboardState(isAuthed) {
  if (isAuthed) {
    dashLogin.hidden = true;
    dashContent.hidden = false;
  } else {
    dashLogin.hidden = false;
    dashContent.hidden = true;
  }
}
 
dashLoginForm.addEventListener("submit", async e => {
  e.preventDefault();
  const email = dashEmail.value.trim();
  const pw = dashPassword.value;
 
  try {
    await signInWithEmailAndPassword(auth, email, pw);
    dashError.textContent = "";
    dashEmail.value = "";
    dashPassword.value = "";
  } catch (err) {
    console.error(err);
    dashError.textContent = "Incorrect email or password. Try again.";
  }
});
 
dashLogout.addEventListener("click", () => {
  signOut(auth);
});
 
onAuthStateChanged(auth, user => {
  showDashboardState(!!user);
});
 
/* ===================================================================
   DASHBOARD — TABS
=================================================================== */
document.querySelectorAll(".dash-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".dash-tab").forEach(t => t.classList.toggle("active", t === tab));
    document.querySelectorAll(".dash-panel").forEach(p =>
      p.classList.toggle("active", p.id === "panel-" + tab.dataset.tab)
    );
  });
});
 
/* ===================================================================
   DASHBOARD — ADD GADGET (with image -> base64)
=================================================================== */
function compressImage(file, maxDim = 900, startQuality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round(height * (maxDim / width));
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round(width * (maxDim / height));
          height = maxDim;
        }
 
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
 
        let quality = startQuality;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
 
        // Keep shrinking quality until well under Firestore's ~1MB field limit
        while (dataUrl.length > 700000 && quality > 0.3) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
 
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
 
gImageInput.addEventListener("change", async () => {
  const file = gImageInput.files[0];
  if (!file) return;
 
  try {
    pendingImageData = await compressImage(file);
    gImagePreview.src = pendingImageData;
    gImagePreviewWrap.hidden = false;
  } catch (err) {
    console.error(err);
    showToast("Could not process that image. Try a different one.");
  }
});
 
gImageRemove.addEventListener("click", () => {
  pendingImageData = null;
  gImageInput.value = "";
  gImagePreviewWrap.hidden = true;
});
 
addGadgetForm.addEventListener("submit", async e => {
  e.preventDefault();
 
  const specsRaw = document.getElementById("gSpecs").value.trim();
  const specs = specsRaw ? specsRaw.split(",").map(s => s.trim()).filter(Boolean) : [];
 
  const payload = {
    type: document.getElementById("gType").value,
    brand: document.getElementById("gBrand").value.trim(),
    title: document.getElementById("gTitle").value.trim(),
    condition: document.getElementById("gCondition").value,
    battery: Number(document.getElementById("gBattery").value) || 0,
    specs: specs,
    price: Number(document.getElementById("gPrice").value) || 0,
    image: pendingImageData || "",
    createdAt: serverTimestamp()
  };
 
  try {
    await addDoc(collection(db, "products"), payload);
    addGadgetForm.reset();
    pendingImageData = null;
    gImagePreviewWrap.hidden = true;
    showToast("Gadget added to Buy Tech.");
  } catch (err) {
    console.error(err);
    showToast("Could not add gadget. Please try again.");
  }
});
 
/* ===================================================================
   DASHBOARD — TABLES
=================================================================== */
function renderGadgetsTable() {
  gadgetsTableBody.innerHTML = "";
  gadgetsEmpty.style.display = products.length === 0 ? "block" : "none";
 
  products.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHTML(p.title || "")}</td>
      <td>${escapeHTML(p.type || "")}</td>
      <td>${escapeHTML(p.condition || "")}</td>
      <td>₹${Number(p.price || 0).toLocaleString("en-IN")}</td>
      <td><button type="button" class="row-delete" data-del-product="${p.id}">Delete</button></td>
    `;
    gadgetsTableBody.appendChild(tr);
  });
}
 
function renderSellTable() {
  sellTableBody.innerHTML = "";
  sellEmpty.style.display = sellRequests.length === 0 ? "block" : "none";
 
  sellRequests.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHTML(s.brandModel || "")}</td>
      <td>${escapeHTML(s.condition || "")}</td>
      <td>₹${Number(s.price || 0).toLocaleString("en-IN")}</td>
      <td>${escapeHTML(s.name || "")}</td>
      <td>${escapeHTML(s.phone || "")}</td>
      <td>${escapeHTML(s.email || "")}</td>
      <td>${formatDate(s.createdAt)}</td>
      <td><button type="button" class="row-delete" data-del-sell="${s.id}">Delete</button></td>
    `;
    sellTableBody.appendChild(tr);
  });
}
 
function renderOrdersTable() {
  ordersTableBody.innerHTML = "";
  ordersEmpty.style.display = orders.length === 0 ? "block" : "none";
 
  orders.forEach(o => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHTML(o.productTitle || "")}</td>
      <td>₹${Number(o.price || 0).toLocaleString("en-IN")}</td>
      <td>${escapeHTML(o.name || "")}</td>
      <td>${escapeHTML(o.phone || "")}</td>
      <td>${escapeHTML(o.email || "")}</td>
      <td>${formatDate(o.createdAt)}</td>
      <td><button type="button" class="row-delete" data-del-order="${o.id}">Delete</button></td>
    `;
    ordersTableBody.appendChild(tr);
  });
}
 
function formatDate(ts) {
  if (!ts || !ts.toDate) return "-";
  return ts.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
 
function updateStats() {
  statGadgets.textContent = products.length;
  statSell.textContent = sellRequests.length;
  statOrders.textContent = orders.length;
}
 
/* ===================================================================
   DELETE BUTTON DELEGATION
=================================================================== */
document.addEventListener("click", async e => {
  const delProduct = e.target.closest("[data-del-product]");
  if (delProduct) {
    try {
      await deleteDoc(doc(db, "products", delProduct.dataset.delProduct));
      showToast("Gadget deleted.");
    } catch (err) {
      console.error(err);
    }
    return;
  }
 
  const delSell = e.target.closest("[data-del-sell]");
  if (delSell) {
    try {
      await deleteDoc(doc(db, "sellRequests", delSell.dataset.delSell));
      showToast("Sell request deleted.");
    } catch (err) {
      console.error(err);
    }
    return;
  }
 
  const delOrder = e.target.closest("[data-del-order]");
  if (delOrder) {
    try {
      await deleteDoc(doc(db, "orders", delOrder.dataset.delOrder));
      showToast("Order deleted.");
    } catch (err) {
      console.error(err);
    }
    return;
  }
});
 
/* ===================================================================
   REALTIME FIRESTORE LISTENERS
=================================================================== */
onSnapshot(query(collection(db, "products"), orderBy("createdAt", "desc")), snapshot => {
  products = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderHomeFeatured();
  renderBuyGrid();
  renderGadgetsTable();
  updateStats();
}, err => console.error("products listener error:", err));
 
onSnapshot(query(collection(db, "sellRequests"), orderBy("createdAt", "desc")), snapshot => {
  sellRequests = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderSellTable();
  updateStats();
}, err => console.error("sellRequests listener error:", err));
 
onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), snapshot => {
  orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderOrdersTable();
  updateStats();
}, err => console.error("orders listener error:", err));
 
/* ===================================================================
   INIT
=================================================================== */
navigateTo("home");
