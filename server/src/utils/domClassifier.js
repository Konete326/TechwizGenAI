export function detectAppProfileFromDom(domData, domain = '') {
  if (!Array.isArray(domData) || domData.length === 0) {
    return { appName: '', appCategory: 'General' };
  }

  let titleText = '';
  const titleNode = domData.find(n => n && n.element === 'title');
  if (titleNode && titleNode.text) {
    titleText = titleNode.text.trim();
  }

  if (!titleText) {
    const h1Node = domData.find(n => n && n.element === 'h1' && n.text && n.text.length < 60);
    if (h1Node) {
      titleText = h1Node.text.trim();
    }
  }

  if (!titleText && domain) {
    try {
      const parsed = new URL(domain.startsWith('http') ? domain : `https://${domain}`);
      const hostPart = parsed.hostname.split('.')[0];
      if (hostPart && hostPart !== 'localhost' && hostPart !== 'www') {
        titleText = hostPart.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
    } catch (e) {}
  }

  let cleanedAppName = titleText;
  if (cleanedAppName) {
    cleanedAppName = cleanedAppName
      .replace(/\s*[-–|•]\s*(Home|Dashboard|Welcome|Admin|Portal|Index|Overview|Page)$/i, '')
      .trim();
  }

  const textCorpus = domData
    .map(n => `${n.text || ''} ${n.name || ''} ${n.placeholder || ''} ${n.ariaLabel || ''} ${n.id || ''}`)
    .join(' ')
    .toLowerCase();

  const posKeywords = ['cart', 'cashier', 'pos', 'register', 'checkout', 'barcode', 'tender', 'receipt', 'subtotal', 'bill', 'scanner', 'drawer', 'terminal', 'sku'];
  const crmKeywords = ['lead', 'leads', 'pipeline', 'deal', 'deals', 'crm', 'contact', 'contacts', 'prospect', 'opportunity', 'quota', 'stage', 'campaign', 'accounts'];
  const ecomKeywords = ['add to cart', 'wishlist', 'product', 'products', 'ecommerce', 'shop', 'store', 'shipping', 'buy now', 'catalog', 'coupon', 'promo code'];
  const erpKeywords = ['inventory', 'warehouse', 'purchase order', 'supplier', 'vendor', 'stock', 'ledger', 'procurement', 'requisition', 'invoice', 'pallet'];

  const scoreKeywords = (keywords) => {
    let score = 0;
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'g');
      const matches = textCorpus.match(regex);
      if (matches) score += matches.length;
    }
    return score;
  };

  const scores = {
    'POS': scoreKeywords(posKeywords),
    'CRM': scoreKeywords(crmKeywords),
    'E-Commerce': scoreKeywords(ecomKeywords),
    'ERP': scoreKeywords(erpKeywords)
  };

  let bestCategory = 'General';
  let highestScore = 0;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > highestScore && score >= 2) {
      highestScore = score;
      bestCategory = cat;
    }
  }

  return {
    appName: cleanedAppName || '',
    appCategory: bestCategory,
    scores
  };
}
