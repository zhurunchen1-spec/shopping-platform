const state = {
  all: [],
  currentCategory: "全部",
  keyword: "",
  sortBy: "default",
  visitorName: "",
};

const categoryLimit = 7;

async function loadProducts() {
  const response = await fetch("商品清单_2000.csv");
  const text = await response.text();
  const rows = text.trim().split(/\r?\n/);
  const headers = rows[0].replace(/^\uFEFF/, "").split(",");

  return rows.slice(1).map((line, index) => {
    const cols = line.split(",");
    const item = Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? ""]));
    item.售价 = Number(item.售价);
    item.__index = index;
    item.image = `https://picsum.photos/seed/${encodeURIComponent(item.商品名称)}/500/360`;
    return item;
  });
}

function setupNameGate() {
  const gate = document.getElementById("nameGate");
  const app = document.getElementById("app");
  const input = document.getElementById("nameInput");
  const btn = document.getElementById("enterBtn");

  const enter = () => {
    const name = input.value.trim();
    if (!name) {
      input.focus();
      return;
    }
    state.visitorName = name;
    gate.classList.add("hidden");
    app.classList.remove("hidden");
    document.getElementById("welcomeText").textContent = `欢迎你，${name}`;
  };

  btn.addEventListener("click", enter);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") enter();
  });
}

function buildCategoryNav() {
  const quickWrap = document.getElementById("quickCategories");
  const dropdown = document.getElementById("moreDropdown");
  const moreBtn = document.getElementById("moreBtn");

  const categories = ["全部", ...new Set(state.all.map((x) => x.商品类别))];
  const quick = categories.slice(0, categoryLimit);
  const more = categories.slice(categoryLimit);

  quickWrap.innerHTML = "";
  dropdown.innerHTML = "";

  const createBtn = (cat, cls = "category-btn") => {
    const btn = document.createElement("button");
    btn.className = cls;
    btn.textContent = cat;
    if (cat === state.currentCategory) btn.classList.add("active");
    btn.onclick = () => {
      state.currentCategory = cat;
      render();
      dropdown.classList.add("hidden");
    };
    return btn;
  };

  quick.forEach((cat) => quickWrap.appendChild(createBtn(cat)));

  if (more.length) {
    moreBtn.classList.remove("hidden");
    moreBtn.onclick = () => dropdown.classList.toggle("hidden");
    more.forEach((cat) => dropdown.appendChild(createBtn(cat, "dropdown-item")));
  } else {
    moreBtn.classList.add("hidden");
  }
}

function getFilteredProducts() {
  let products = [...state.all];
  if (state.currentCategory !== "全部") {
    products = products.filter((x) => x.商品类别 === state.currentCategory);
  }
  if (state.keyword) {
    const k = state.keyword.toLowerCase();
    products = products.filter((x) => `${x.商品名称}${x.商品品牌}`.toLowerCase().includes(k));
  }

  if (state.sortBy === "priceAsc") products.sort((a, b) => a.售价 - b.售价);
  if (state.sortBy === "priceDesc") products.sort((a, b) => b.售价 - a.售价);
  if (state.sortBy === "ratingDesc") {
    products.sort((a, b) => parseFloat(b.好评率) - parseFloat(a.好评率));
  }
  if (state.sortBy === "default") products.sort((a, b) => a.__index - b.__index);
  return products;
}

function renderProducts(list) {
  const grid = document.getElementById("productGrid");
  grid.innerHTML = "";

  list.forEach((p) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `
      <img loading="lazy" src="${p.image}" alt="${p.商品名称}" />
      <div class="product-content">
        <h3 class="product-title">${p.商品名称}</h3>
        <div class="meta">类别：${p.商品类别}</div>
        <div class="meta">品牌：${p.商品品牌}</div>
        <div class="price">¥${p.售价.toFixed(2)}</div>
        <div class="meta">售价来源平台：${p.售价来源平台}</div>
        <div class="meta">销售平台：${p.销售平台}</div>
        <div class="meta">好评率：${p.好评率}</div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function render() {
  buildCategoryNav();
  const list = getFilteredProducts();
  document.getElementById("summary").textContent = `共 ${list.length} 件商品（总计 ${state.all.length} 件）`;
  renderProducts(list);
}

function bindEvents() {
  document.getElementById("searchInput").addEventListener("input", (e) => {
    state.keyword = e.target.value.trim();
    render();
  });

  document.getElementById("sortSelect").addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    render();
  });

  document.addEventListener("click", (e) => {
    const menu = document.querySelector(".more-menu");
    if (!menu.contains(e.target)) {
      document.getElementById("moreDropdown").classList.add("hidden");
    }
  });
}

(async function init() {
  setupNameGate();
  state.all = await loadProducts();
  bindEvents();
  render();
})();
