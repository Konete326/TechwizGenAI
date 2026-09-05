import { useRef, memo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";
import { DownloadSimple, ChartBar, ChartLine, ChartPie } from "@phosphor-icons/react";

const PALETTE = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#3b82f6"];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-surface-card/95 p-2 shadow-xl backdrop-blur font-mono text-xs">
        <p className="font-semibold text-text-primary">{label || payload[0].name}</p>
        <p className="text-accent font-medium">
          {payload[0].value?.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export const DashboardChart = memo(function DashboardChart({
  type = "bar",
  title = "Analytical Chart",
  data = []
}) {
  const chartRef = useRef(null);
  const chartType = (type || "bar").toLowerCase();

  const handleDownload = () => {
    if (!chartRef.current) return;
    const svgEl = chartRef.current.querySelector("svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "-") || "chart"}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const IconComponent = chartType === "pie" ? ChartPie : (chartType === "line" ? ChartLine : ChartBar);

  return (
    <div className="relative my-3 w-full rounded-xl border border-border bg-surface-card p-4 shadow-sm transition-all hover:border-accent/40">
      <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-md bg-accent/10 text-accent border border-accent/20">
            <IconComponent size={16} weight="fill" />
          </div>
          <h4 className="text-xs font-semibold text-text-primary truncate">
            {title}
          </h4>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
          title="Download Chart (SVG)"
          aria-label="Download chart"
        >
          <DownloadSimple size={14} weight="bold" />
        </button>
      </div>

      <div ref={chartRef} className="h-64 w-full min-w-0 text-xs font-mono">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "line" ? (
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3, fill: "#8b5cf6" }} activeDot={{ r: 5 }} />
            </LineChart>
          ) : chartType === "area" ? (
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#areaGrad)" />
            </AreaChart>
          ) : chartType === "pie" ? (
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={42} paddingAngle={3}>
                {data.map((_, idx) => (
                  <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : (
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                {data.map((_, idx) => (
                  <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {chartType === "pie" && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-[11px] text-text-muted font-mono">
          {data.map((item, idx) => (
            <span key={idx} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
              <span>{item.name}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

export default DashboardChart;
