import {
  ShoppingCart,
  Tag,
  CreditCard,
  Receipt,
  UserCheck,
  Compass,
  UserPlus,
  TrendUp,
  AddressBook,
  CalendarCheck,
  ChartBar,
  Trash,
  MagnifyingGlass,
  Bag,
  Ticket,
  Truck,
  ClockCounterClockwise,
  Star,
  Package,
  FileText,
  MapPin,
  BookOpen,
  ShieldCheck,
  Textbox,
  CursorClick,
  Eye,
  ChatCircleText,
  Sparkle
} from '@phosphor-icons/react';

export const CATEGORY_POWERS = {
  POS: [
    {
      key: 'cartOperations',
      title: 'Cart & Item Operations',
      desc: 'Allows Nisa to add items to cart, modify quantities, remove items, or clear cart on cashier voice commands.',
      icon: ShoppingCart,
      color: 'emerald'
    },
    {
      key: 'discountsAndTender',
      title: 'Discounts & Price Overrides',
      desc: 'Grants permission to apply percentage discounts, line item price adjustments, and promo coupons.',
      icon: Tag,
      color: 'amber'
    },
    {
      key: 'checkoutAndPayment',
      title: 'Checkout & Tender Payment',
      desc: 'Empowers Nisa to trigger checkout modals, select payment methods (Cash, Card, UPI), and finalize transactions.',
      icon: CreditCard,
      color: 'blue'
    },
    {
      key: 'receiptPrinting',
      title: 'Receipt & Bill Generation',
      desc: 'Enables Nisa to click print receipt, email invoice to customer, or reprint recent transactions.',
      icon: Receipt,
      color: 'purple'
    },
    {
      key: 'customerAttachment',
      title: 'Customer Lookup & Loyalty Link',
      desc: 'Allows Nisa to search customer database, link customer phone/number to the current sale ticket.',
      icon: UserCheck,
      color: 'indigo'
    },
    {
      key: 'registerNavigation',
      title: 'Register & Shift Navigation',
      desc: 'Enables Nisa to switch sales categories, open cash drawer summaries, and switch cashier registers.',
      icon: Compass,
      color: 'rose'
    }
  ],
  CRM: [
    {
      key: 'leadCreation',
      title: 'Lead & Contact Creation',
      desc: 'Allows Nisa to auto-fill and submit new lead intake forms, prospect details, and contact information.',
      icon: UserPlus,
      color: 'emerald'
    },
    {
      key: 'dealPipeline',
      title: 'Deal & Pipeline Stage Moves',
      desc: 'Grants permission to drag/advance deals across pipeline stages, update deal value, and close won/lost.',
      icon: TrendUp,
      color: 'blue'
    },
    {
      key: 'contactManagement',
      title: 'Contact Info & Profile Edits',
      desc: 'Empowers Nisa to update phone numbers, emails, addresses, and company profile fields for clients.',
      icon: AddressBook,
      color: 'amber'
    },
    {
      key: 'activityLogging',
      title: 'Call & Meeting Activity Logging',
      desc: 'Enables Nisa to log customer calls, record interaction notes, and schedule calendar follow-up reminders.',
      icon: CalendarCheck,
      color: 'purple'
    },
    {
      key: 'reportsAndAnalytics',
      title: 'Pipeline Analytics & KPI Views',
      desc: 'Allows Nisa to switch between quota dashboards, view revenue charts, and filter conversion metrics.',
      icon: ChartBar,
      color: 'indigo'
    },
    {
      key: 'recordDeletion',
      title: 'Sensitive Record Deletion',
      desc: 'Permission for Nisa to delete contacts, purge duplicate records, or archive old prospect files.',
      icon: Trash,
      color: 'red'
    }
  ],
  'E-Commerce': [
    {
      key: 'catalogSearch',
      title: 'Catalog Search & Filtering',
      desc: 'Allows Nisa to search products, apply filters for price, category, size, and sort online catalog.',
      icon: MagnifyingGlass,
      color: 'emerald'
    },
    {
      key: 'cartAndWishlist',
      title: 'Cart & Wishlist Adjustments',
      desc: 'Grants permission to add/remove products from bag, change sizes/variants, or save items to wishlist.',
      icon: Bag,
      color: 'blue'
    },
    {
      key: 'couponApplication',
      title: 'Promo Codes & Discount Vouchers',
      desc: 'Enables Nisa to type and validate promo discount codes and redeem loyalty points at checkout.',
      icon: Ticket,
      color: 'amber'
    },
    {
      key: 'checkoutFormFilling',
      title: 'Shipping & Address Autofill',
      desc: 'Empowers Nisa to fill shipping address fields, select delivery methods, and enter billing details.',
      icon: Truck,
      color: 'purple'
    },
    {
      key: 'orderTracking',
      title: 'Order Status & History Tracking',
      desc: 'Allows Nisa to navigate to order history, track shipping packages, and check delivery status.',
      icon: ClockCounterClockwise,
      color: 'indigo'
    },
    {
      key: 'reviewSubmission',
      title: 'Customer Reviews & Ratings',
      desc: 'Permission for Nisa to submit star ratings, write product reviews, and post user feedback.',
      icon: Star,
      color: 'rose'
    }
  ],
  ERP: [
    {
      key: 'inventoryAdjustment',
      title: 'Stock & Inventory Adjustments',
      desc: 'Allows Nisa to log inventory stock counts, report discrepancies, and update warehouse quantities.',
      icon: Package,
      color: 'emerald'
    },
    {
      key: 'purchaseOrders',
      title: 'Purchase Orders & Procurement',
      desc: 'Grants permission to generate purchase orders, submit supplier requests, and route for approval.',
      icon: FileText,
      color: 'blue'
    },
    {
      key: 'invoiceBilling',
      title: 'Invoice & Bill Verification',
      desc: 'Enables Nisa to review supplier invoices, match 3-way POs, and verify payment vouchers.',
      icon: Receipt,
      color: 'amber'
    },
    {
      key: 'warehouseRouting',
      title: 'Warehouse & Bin Location Routing',
      desc: 'Empowers Nisa to navigate bin racks, view pallet allocations, and route picking dispatch lists.',
      icon: MapPin,
      color: 'purple'
    },
    {
      key: 'financialLedgers',
      title: 'General Ledger & Journal Entries',
      desc: 'Allows Nisa to view debit/credit balances, inspect journal vouchers, and audit account ledgers.',
      icon: BookOpen,
      color: 'indigo'
    },
    {
      key: 'auditLogging',
      title: 'Compliance & Audit Approval',
      desc: 'Permission for Nisa to sign off on audit trails, export compliance logs, and approve requisitions.',
      icon: ShieldCheck,
      color: 'rose'
    }
  ],
  General: [
    {
      key: 'formFilling',
      title: 'Ambient Form & Search Autofill',
      desc: 'Enables Nisa to fill out input forms, change dropdowns, type queries into search bars, and update textareas via voice dictation.',
      icon: Textbox,
      color: 'blue'
    },
    {
      key: 'elementClicking',
      title: 'Universal Button & Action Triggering',
      desc: 'Grants autonomous authority to click buttons, activate tabs, dismiss dialogs, and submit actions on the screen.',
      icon: CursorClick,
      color: 'emerald'
    },
    {
      key: 'navigation',
      title: 'Cross-Page & Route Navigation',
      desc: 'Empowers Nisa to navigate between URLs, SPA routes, tabs, and dashboard views on voice request.',
      icon: Compass,
      color: 'purple'
    },
    {
      key: 'dataExtraction',
      title: 'Screen Data Extraction & Summaries',
      desc: 'Enables Nisa to inspect visible tables, status tags, metrics cards, and summarize on-screen data accurately.',
      icon: Eye,
      color: 'amber'
    },
    {
      key: 'dynamicModals',
      title: 'Dynamic Floating Modals & Notes',
      desc: 'Allows Nisa to present floating rich-text notes, translation cards, and confirmation dialogues on top of the host screen.',
      icon: ChatCircleText,
      color: 'sky'
    },
    {
      key: 'spotlightGuidance',
      title: 'Visual Spotlight & Ripple Guidance',
      desc: 'Directs the user visually by smoothly scrolling to target controls and illuminating them with a pulsating highlight ring.',
      icon: Sparkle,
      color: 'indigo'
    }
  ]
};

export function getCategoryPowers(category) {
  return CATEGORY_POWERS[category] || CATEGORY_POWERS.General;
}

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
