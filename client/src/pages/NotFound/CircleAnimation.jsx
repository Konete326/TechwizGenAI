import { useRef, useEffect } from "react";

export function CircleAnimation() {
  const canvasRef = useRef(null);
  const animationFrameId = useRef();
  const count = useRef(0);
  const circles = useRef([]);

  const initArr = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    circles.current = [];
    for (let i = 0; i < 300; i++) {
      const x =
        Math.floor(Math.random() * (canvas.width * 3 - canvas.width * 1.2 + 1)) +
        canvas.width * 1.2;
      const y =
        Math.floor(Math.random() * (canvas.height - (canvas.height * -0.2 + 1))) +
        canvas.height * -0.2;
      const size = canvas.width / 1000;
      circles.current.push({ x, y, size });
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    count.current++;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const speedX = canvas.width / 80;
    const growth = canvas.width / 1000;
    ctx.fillStyle = "white";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    circles.current.forEach((circle) => {
      ctx.beginPath();
      if (count.current < 65) {
        circle.x = circle.x - speedX;
        circle.size = circle.size + growth;
      }
      if (count.current > 65 && count.current < 500) {
        circle.x = circle.x - speedX * 0.02;
        circle.size = circle.size + growth * 0.2;
      }
      ctx.arc(circle.x, circle.y, circle.size, 0, 360);
      ctx.fill();
    });
    if (count.current > 500) {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      return;
    }
    animationFrameId.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    count.current = 0;
    initArr();
    draw();

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      count.current = 0;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      const ctx = canvas.getContext("2d");
      if (ctx && ctx.reset) {
        ctx.reset();
      }
      initArr();
      draw();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

export default CircleAnimation;
