export function Loader({ size = 20, className = "", ...props }) {
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
      {...props}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full text-current"
        style={{
          animation: "loaderBreathe 2.4s ease-in-out infinite, loaderRotate 4s linear infinite",
          transformOrigin: "center"
        }}
      >
        <style>{`
          @keyframes loaderRotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes loaderBreathe {
            0%, 100% { transform: scale(0.88); opacity: 0.8; }
            50% { transform: scale(1.05); opacity: 1; }
          }
          @keyframes loaderDraw {
            0% { stroke-dashoffset: 260; }
            50% { stroke-dashoffset: 65; }
            100% { stroke-dashoffset: 0; }
          }
          @keyframes loaderInnerDraw {
            0% { stroke-dashoffset: 140; transform: rotate(0deg); }
            50% { stroke-dashoffset: 35; transform: rotate(-180deg); }
            100% { stroke-dashoffset: 0; transform: rotate(-360deg); }
          }
          .loader-outer {
            stroke-dasharray: 260;
            animation: loaderDraw 2s ease-in-out infinite alternate;
          }
          .loader-inner {
            stroke-dasharray: 140;
            transform-origin: center;
            animation: loaderInnerDraw 2s ease-in-out infinite alternate;
          }
          .loader-pulse {
            animation: loaderBreathe 1.5s ease-in-out infinite;
          }
        `}</style>
        <polygon
          points="50 8, 90 28, 90 72, 50 92, 10 72, 10 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="loader-outer"
        />
        <polygon
          points="50 25, 75 38, 75 62, 50 75, 25 62, 25 38"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="loader-inner"
        />
        <circle
          cx="50"
          cy="50"
          r="4"
          fill="currentColor"
          className="loader-pulse"
        />
      </svg>
    </span>
  );
}

export default Loader;
