const elements = {
  total: document.querySelector("#total-count"),
  updated: document.querySelector("#updated-at"),
  summary: document.querySelector("#result-summary"),
  grid: document.querySelector("#product-grid"),
  search: document.querySelector("#search"),
  brand: document.querySelector("#brand"),
  category: document.querySelector("#category"),
  reset: document.querySelector("#reset"),
  emptyReset: document.querySelector("#empty-reset"),
  empty: document.querySelector("#empty-state"),
  error: document.querySelector("#error-state"),
};

const yen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});
const normalize = value =>
  String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ja");
let products = [];

function safePublicUrl(value) {
  if (typeof value !== "string") return false;
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function addOptions(select, values) {
  const existingValues = new Set(
    Array.from(select.options, option => option.value)
  );
  for (const value of [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "ja")
  )) {
    if (existingValues.has(value)) continue;
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  }
}

function productCard(product, index) {
  const card = element("article", "product-card");
  const top = element("div", "card-top");
  top.append(
    element("span", "card-category", product.category || "カテゴリ未登録"),
    element("span", "card-index", String(index + 1).padStart(2, "0"))
  );
  const brand = element("p", "card-brand", product.brand || "ブランド未登録");
  const title = element("h3", "card-name", product.name);
  const bottom = element("div", "card-bottom");
  const sku = element("div", "card-detail");
  sku.append(
    element("span", "card-detail-label", "PRODUCT CODE"),
    element("strong", "card-sku", product.sku)
  );
  const price = element("div", "card-detail card-price");
  price.append(
    element("span", "card-detail-label", "定価"),
    element(
      "strong",
      product.listPriceYen === null ? "price-unset" : "price-value",
      product.listPriceYen === null
        ? "未登録"
        : yen.format(product.listPriceYen)
    )
  );
  bottom.append(sku, price);
  const material = product.materialUrl
    ? element("a", "material-link", "商品資料を見る")
    : element("span", "material-link material-unavailable", "資料は未登録");
  if (product.materialUrl) {
    material.href = product.materialUrl;
    material.target = "_blank";
    material.rel = "noopener noreferrer nofollow";
    material.setAttribute(
      "aria-label",
      `${product.name}の資料を新しいタブで開く`
    );
    const arrow = element("span", "material-arrow", "↗");
    arrow.setAttribute("aria-hidden", "true");
    material.append(arrow);
  }
  card.append(top, brand, title, bottom, material);
  return card;
}

function render() {
  const term = normalize(elements.search.value.trim());
  const brand = elements.brand.value;
  const category = elements.category.value;
  const visible = products.filter(
    product =>
      (!brand || product.brand === brand) &&
      (!category || product.category === category) &&
      (!term ||
        normalize(
          [product.name, product.brand, product.category, product.sku].join(" ")
        ).includes(term))
  );
  elements.grid.replaceChildren(...visible.map(productCard));
  elements.summary.textContent = `${visible.length} 件の商品を表示${visible.length === products.length ? "" : ` / 全 ${products.length} 件`}`;
  elements.empty.hidden = visible.length > 0;
  elements.error.hidden = true;
  elements.reset.hidden = !term && !brand && !category;
}

function resetFilters() {
  elements.search.value = "";
  elements.brand.value = "";
  elements.category.value = "";
  render();
  elements.search.focus();
}

async function loadCatalog() {
  try {
    const response = await fetch("./products.json", { cache: "no-store" });
    if (!response.ok) throw new Error("商品データが取得できません");
    const catalog = await response.json();
    if (
      !Array.isArray(catalog.products) ||
      !Number.isFinite(Date.parse(catalog.generatedAt))
    ) {
      throw new Error("商品データの形式が正しくありません");
    }
    products = catalog.products.filter(
      product =>
        product &&
        typeof product.name === "string" &&
        typeof product.sku === "string" &&
        typeof product.brand === "string" &&
        typeof product.category === "string" &&
        safePublicUrl(product.materialUrl) &&
        (product.listPriceYen === null ||
          (Number.isSafeInteger(product.listPriceYen) &&
            product.listPriceYen >= 0))
    );
    elements.total.textContent = String(products.length).padStart(2, "0");
    elements.updated.textContent = `${new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Tokyo" }).format(new Date(catalog.generatedAt))} 更新`;
    addOptions(
      elements.brand,
      products.map(product => product.brand)
    );
    addOptions(
      elements.category,
      products.map(product => product.category)
    );
    render();
  } catch {
    elements.total.textContent = "—";
    elements.updated.textContent = "更新情報を取得できません";
    elements.summary.textContent = "商品情報を読み込めませんでした";
    elements.grid.replaceChildren();
    elements.empty.hidden = true;
    elements.error.hidden = false;
  }
}

elements.search.addEventListener("input", render);
elements.brand.addEventListener("change", render);
elements.category.addEventListener("change", render);
elements.reset.addEventListener("click", resetFilters);
elements.emptyReset.addEventListener("click", resetFilters);
document.querySelector("#footer-year").textContent = String(
  new Date().getFullYear()
);
loadCatalog();
