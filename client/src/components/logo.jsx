import logoImg from "@/assets/logo.png";

export const LogoIcon = ({ className = "w-6 h-6", ...props }) => (
  <img src={logoImg} alt="Techwiz GenAI" className={`object-contain ${className}`} {...props} />
);

export const Logo = ({ className = "h-7 w-auto", ...props }) => (
  <img src={logoImg} alt="Techwiz GenAI" className={`object-contain ${className}`} {...props} />
);

export default Logo;
