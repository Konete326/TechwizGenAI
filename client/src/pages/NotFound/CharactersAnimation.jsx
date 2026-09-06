import { useRef, useEffect } from "react";

export function CharactersAnimation() {
  const containerRef = useRef(null);

  useEffect(() => {
    const charactersList = [
      {
        top: "0%",
        src: "https://cdn.21st.dev/assets/mirror/54/54f366bdbf75b7a2d3b9f2264c3ada12aefcaf6e6a467bcecc856ffcd686e52e.svg",
        transform: "rotateZ(-90deg)",
        speedX: 1500
      },
      {
        top: "10%",
        src: "https://cdn.21st.dev/assets/mirror/7e/7e48603d6fd3fac9720b25b4b6a06d107feea2d21ef8fa0720921808b9808514.svg",
        speedX: 3000,
        speedRotation: 2000
      },
      {
        top: "20%",
        src: "https://cdn.21st.dev/assets/mirror/4f/4fd3a604a36cc8811c341ef3221010ed11e2563d4add29901922d7464c28c186.svg",
        speedX: 5000,
        speedRotation: 1000
      },
      {
        top: "25%",
        src: "https://cdn.21st.dev/assets/mirror/54/54f366bdbf75b7a2d3b9f2264c3ada12aefcaf6e6a467bcecc856ffcd686e52e.svg",
        speedX: 2500,
        speedRotation: 1500
      },
      {
        top: "35%",
        src: "https://cdn.21st.dev/assets/mirror/54/54f366bdbf75b7a2d3b9f2264c3ada12aefcaf6e6a467bcecc856ffcd686e52e.svg",
        speedX: 2000,
        speedRotation: 300
      },
      {
        bottom: "5%",
        src: "https://cdn.21st.dev/assets/mirror/66/668d66f4c4d1dbc5c421692b4e5ad644c0f11f0327da214bcae21f78816c6b2f.svg",
        speedX: 0
      }
    ];

    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }

    charactersList.forEach((item, index) => {
      const img = document.createElement("img");
      img.classList.add("characters");
      img.style.position = "absolute";
      img.style.width = "18%";
      img.style.height = "18%";
      if (item.top) img.style.top = item.top;
      if (item.bottom) img.style.bottom = item.bottom;
      img.src = item.src;
      if (item.transform) img.style.transform = item.transform;
      containerRef.current?.appendChild(img);

      if (index !== 5) {
        img.animate([{ left: "100%" }, { left: "-20%" }], {
          duration: item.speedX,
          easing: "linear",
          fill: "forwards"
        });
        if (index !== 0 && item.speedRotation) {
          img.animate(
            [{ transform: "rotate(0deg)" }, { transform: "rotate(-360deg)" }],
            {
              duration: item.speedRotation,
              iterations: Infinity,
              easing: "linear"
            }
          );
        }
      }
    });

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
        containerRef.current.dispatchEvent(new Event("contentchanged"));
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return <div ref={containerRef} className="absolute w-[99%] h-[95%]" />;
}

export default CharactersAnimation;
