let catalogPromise = null;
const CATALOG_CACHE_KEY = 'ssinne_catalog_fast_v1';
const CATALOG_CACHE_TIME = 2 * 60 * 1000;

function readCatalogCache() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(CATALOG_CACHE_KEY) || 'null'
    );

    if (
      saved &&
      Array.isArray(saved.products) &&
      Date.now() - saved.time < CATALOG_CACHE_TIME
    ) {
      return saved.products;
    }
  } catch (e) {
    console.warn('상품 캐시 읽기 실패', e);
  }

  return null;
}

function saveCatalogCache(products) {
  try {
    localStorage.setItem(
      CATALOG_CACHE_KEY,
      JSON.stringify({
        time: Date.now(),
        products: products
      })
    );
  } catch (e) {
    console.warn('상품 캐시 저장 실패', e);
  }
}

async function fetchCatalog() {
  if (catalogPromise) {
    return catalogPromise;
  }

  catalogPromise = (async () => {
    const r = await api('catalog', {
      cacheBust: Date.now()
    });

    const products = r.products || [];

    state.catalog = products;
    saveCatalogCache(products);

    return products;
  })();

  try {
    return await catalogPromise;
  } finally {
    catalogPromise = null;
  }
}

async function ensureCatalog() {
  if (state.catalog.length) {
    return state.catalog;
  }

  const cached = readCatalogCache();

  if (cached) {
    state.catalog = cached;
    return cached;
  }

  busy(true, '상품정보를 불러오는 중입니다...');

  try {
    return await fetchCatalog();
  } finally {
    busy(false);
  }
}
