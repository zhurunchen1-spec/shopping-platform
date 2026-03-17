const state = {
  all: [],
  currentCategory: "全部",
  keyword: "",
  sortBy: "default",
  visitorName: "",
  page: 1,
  pageSize: 24,
};

const categoryLimit = 7;

const trustedPlatforms = [
  { name: "京东", site: "https://www.jd.com" },
  { name: "天猫", site: "https://www.tmall.com" },
  { name: "淘宝", site: "https://www.taobao.com" },
  { name: "拼多多", site: "https://www.pinduoduo.com" },
  { name: "苏宁易购", site: "https://www.suning.com" },
  { name: "图片来源（Wikimedia Commons）", site: "https://commons.wikimedia.org" },
];

function buildProductImage(product) {
  const title = `${product.商品品牌} ${product.商品类别}`.slice(0, 18);
  const subtitle = `${product.商品名称}`.slice(0, 24);
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='#dbeafe'/>
          <stop offset='100%' stop-color='#eef2ff'/>
        </linearGradient>
      </defs>
      <rect width='100%' height='100%' fill='url(#g)'/>
      <text x='40' y='158' font-size='34' fill='#1e3a8a' font-family='Arial, sans-serif'>${title}</text>
      <text x='40' y='206' font-size='24' fill='#334155' font-family='Arial, sans-serif'>${subtitle}</text>
    </svg>`
  )}`;
}

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
    item.image = buildProductImage(item);
    return item;
  });
}

const STORAGE_KEY = "shopping_platform_visitor";

function getStoredVisitor() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveVisitor(name) {
  const stored = getStoredVisitor();
  const visitor = {
    id: stored?.id || `U${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(visitor));
  return visitor;
}

function enterApp(name) {
  state.visitorName = name;
  document.getElementById("nameGate").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  const visitor = getStoredVisitor();
  const idPart = visitor?.id ? `（ID: ${visitor.id}）` : "";
  document.getElementById("welcomeText").textContent = `欢迎你，${name}${idPart}`;
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
    saveVisitor(name);
    enterApp(name);
  };

  const existing = getStoredVisitor();
  if (existing?.name) {
    input.value = existing.name;
    enterApp(existing.name);
  }

  btn.addEventListener("click", enter);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") enter();
  });
}

function buildSources() {
  const sourceWrap = document.getElementById("trustedSources");
  sourceWrap.innerHTML = trustedPlatforms
    .map((p) => `<a href="${p.site}" target="_blank" rel="noopener noreferrer">${p.name}</a>`)
    .join("");
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
    const count = cat === "全部" ? state.all.length : state.all.filter((x) => x.商品类别 === cat).length;
    const btn = document.createElement("button");
    btn.className = cls;
    btn.textContent = `${cat} (${count})`;
    if (cat === state.currentCategory) btn.classList.add("active");
    btn.onclick = () => {
      state.currentCategory = cat;
      state.page = 1;
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
  if (state.sortBy === "ratingDesc") products.sort((a, b) => parseFloat(b.好评率) - parseFloat(a.好评率));
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

function renderPagination(totalItems) {
  const totalPages = Math.max(1, Math.ceil(totalItems / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;
  const pager = document.getElementById("pagination");
  pager.innerHTML = `
    <button ${state.page === 1 ? "disabled" : ""} id="prevPage">上一页</button>
    <span>第 ${state.page} / ${totalPages} 页</span>
    <button ${state.page === totalPages ? "disabled" : ""} id="nextPage">下一页</button>
  `;
  document.getElementById("prevPage")?.addEventListener("click", () => {
    if (state.page > 1) {
      state.page -= 1;
      render();
    }
  });
  document.getElementById("nextPage")?.addEventListener("click", () => {
    if (state.page < totalPages) {
      state.page += 1;
      render();
    }
  });
}

function render() {
  buildCategoryNav();
  const filtered = getFilteredProducts();
  const start = (state.page - 1) * state.pageSize;
  const paged = filtered.slice(start, start + state.pageSize);
  document.getElementById("summary").textContent = `共 ${filtered.length} 件商品（总计 ${state.all.length} 件），当前展示 ${paged.length} 件`;
  renderProducts(paged);
  renderPagination(filtered.length);
}

function bindEvents() {
  document.getElementById("searchInput").addEventListener("input", (e) => {
    state.keyword = e.target.value.trim();
    state.page = 1;
    render();
  });

  document.getElementById("sortSelect").addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    state.page = 1;
    render();
  });

  document.addEventListener("click", (e) => {
    const menu = document.querySelector(".more-menu");
    if (menu && !menu.contains(e.target)) {
      document.getElementById("moreDropdown").classList.add("hidden");
    }
  });
}

(async function init() {
  setupNameGate();
  buildSources();
  state.all = await loadProducts();
  bindEvents();
  render();
})();
