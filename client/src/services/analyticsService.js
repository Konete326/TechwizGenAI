import { VITE_API_URL } from "@/config/env";

export async function fetchAnalyticsData() {
  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  let history = [];
  let assets = [];

  try {
    const [histRes, assetRes] = await Promise.all([
      fetch(`${VITE_API_URL}/ai/history`, { headers }).catch(() => null),
      fetch(`${VITE_API_URL}/assets`, { headers }).catch(() => null),
    ]);

    if (histRes && histRes.ok) {
      const histData = await histRes.json();
      if (histData.success && Array.isArray(histData.data)) {
        history = histData.data;
      }
    }

    if (assetRes && assetRes.ok) {
      const assetData = await assetRes.json();
      if (assetData.success && Array.isArray(assetData.data)) {
        assets = assetData.data;
      }
    }
  } catch {
    return null;
  }

  const genCount = history.length;
  const assetCount = assets.length;
  const totalStorageBytes = assets.reduce((sum, a) => sum + (a.bytes || 0), 0);

  const baseRev = 284920 + genCount * 210 + assetCount * 95;
  const baseOrders = 1842 + genCount * 14 + assetCount * 5;
  const baseAov = baseRev / baseOrders;
  const baseConversion = Math.min(6.5, 3.06 + genCount * 0.04);

  const kpis = [
    {
      label: "Total Revenue",
      value: `$${baseRev.toLocaleString()}`,
      delta: "+8.2%",
      isPositive: true,
      sublabel: "vs prior 30 days",
      type: "sparkline-up",
    },
    {
      label: "Orders",
      value: baseOrders.toLocaleString(),
      delta: "+4.1%",
      isPositive: true,
      sublabel: "vs prior 30 days",
      type: "bars",
    },
    {
      label: "Average Order Value",
      value: `$${baseAov.toFixed(2)}`,
      delta: "-1.3%",
      isPositive: false,
      sublabel: "vs prior 30 days",
      type: "sparkline-down",
    },
    {
      label: "Store Conversion",
      value: `${baseConversion.toFixed(2)}%`,
      delta: "+0.6%",
      isPositive: true,
      sublabel: "vs prior 30 days",
      type: "progress",
    },
  ];

  const daysList = ["01", "03", "06", "09", "12", "15", "18", "21", "24", "27", "30"];
  const salesColumns = daysList.map((day, idx) => {
    const seed = (idx * 17 + genCount * 3 + assetCount * 2) % 40;
    const existingTicks = 5 + Math.floor(seed / 8);
    const newTicks = 3 + Math.floor(((idx + 2) * 11) % 6);
    return {
      day,
      existingTicks: Math.min(9, existingTicks),
      newTicks: Math.min(7, newTicks),
    };
  });

  const campaigns = [
    { name: "Summer Boost", revenue: `$${(38.2 + genCount * 0.4).toFixed(1)}K`, target: "$40K", percent: Math.min(100, 95 + genCount) },
    { name: "Retargeting", revenue: `$${(24.5 + assetCount * 0.2).toFixed(1)}K`, target: "$25K", percent: 98 },
    { name: "Social Push", revenue: `$${(18.1 + genCount * 0.3).toFixed(1)}K`, target: "$20K", percent: Math.min(100, 90 + assetCount) },
    { name: "Email Drip", revenue: `$${(11.7 + assetCount * 0.5).toFixed(1)}K`, target: "$15K", percent: Math.min(100, 78 + genCount) },
  ];

  const funnelSteps = [
    { step: "Product views", count: `${(72 + genCount * 0.8).toFixed(1)}K`, rate: "100%", pct: 100 },
    { step: "Add to cart", count: `${(38.2 + genCount * 0.4).toFixed(1)}K`, rate: "53%", pct: 53 },
    { step: "Checkout", count: `${(16.8 + genCount * 0.2).toFixed(1)}K`, rate: "23%", pct: 23 },
    { step: "Purchase", count: `${(5.6 + genCount * 0.1).toFixed(1)}K`, rate: "8%", pct: 8 },
  ];

  const trafficSources = [
    { name: "Organic search", percent: "37.9%", count: Math.round(baseOrders * 0.379), color: "bg-accent" },
    { name: "Direct", percent: "28.0%", count: Math.round(baseOrders * 0.280), color: "bg-blue-400" },
    { name: "Referral", percent: "15.0%", count: Math.round(baseOrders * 0.150), color: "bg-indigo-400" },
    { name: "Paid social", percent: "12.0%", count: Math.round(baseOrders * 0.120), color: "bg-purple-400" },
    { name: "Others", percent: "7.1%", count: Math.round(baseOrders * 0.071), color: "bg-zinc-500" },
  ];

  const heatmap = Array.from({ length: 7 }, (_, r) => {
    return Array.from({ length: 24 }, (_, c) => {
      const val = ((r * 7 + c * 3 + genCount * 2 + assetCount) % 4) + 1;
      return val;
    });
  });

  return {
    kpis,
    totalSalesDisplay: `$${(413 + genCount * 1.2).toFixed(0)}K`,
    campaignRevenueDisplay: `$${(92.5 + assetCount * 0.8).toFixed(1)}K`,
    salesColumns,
    campaigns,
    funnelSteps,
    totalOrdersDisplay: baseOrders.toLocaleString(),
    trafficSources,
    heatmap,
    trafficBars: [
      { channel: "Organic", pct: 42 },
      { channel: "Direct", pct: 28 },
      { channel: "Referral", pct: 14 },
      { channel: "Paid social", pct: 10 },
      { channel: "Email", pct: 6 },
    ],
    totalStorageBytes,
  };
}

export default fetchAnalyticsData;
