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

const categoryImageMap = {
  手机数码: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/640px-Apple_logo_black.svg.png",
  家用电器: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/LG_logo_%282014%29.svg/640px-LG_logo_%282014%29.svg.png",
  电脑办公: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Lenovo_logo_2015.svg/640px-Lenovo_logo_2015.svg.png",
  食品生鲜: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Food_placeholder.png/640px-Food_placeholder.png",
  服饰鞋包: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Logo_NIKE.svg/640px-Logo_NIKE.svg.png",
  个护清洁: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Unilever_logo.svg/640px-Unilever_logo.svg.png",
  母婴用品: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Baby_bottle_icon.svg/640px-Baby_bottle_icon.svg.png",
  运动户外: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Decathlon_Logo.svg/640px-Decathlon_Logo.svg.png",
  家居家装: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/IKEA_logo.svg/640px-IKEA_logo.svg.png",
  汽车用品: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Bosch-logo.svg/640px-Bosch-logo.svg.png",
};

const trustedPlatforms = [
  { name: "京东", site: "https://www.jd.com" },
  { name: "天猫", site: "https://www.tmall.com" },
  { name: "淘宝", site: "https://www.taobao.com" },
  { name: "拼多多", site: "https://www.pinduoduo.com" },
  { name: "苏宁易购", site: "https://www.suning.com" },
  { name: "图片来源（Wikimedia Commons）", site: "https://commons.wikimedia.org" },
];

function safeFallbackSvg(name) {
  const text = encodeURIComponent(name.slice(0, 12));
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'><rect width='100%' height='100%' fill='#eef2ff'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='#334155'>${name || text}</text></svg>`
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
    item.image = categoryImageMap[item.商品类别] || safeFallbackSvg(item.商品类别);
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
      <img loading="lazy" src="${p.image}" alt="${p.商品名称}" onerror="this.src='${safeFallbackSvg("商品图片")}';" />
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
