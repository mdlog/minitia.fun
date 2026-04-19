/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#06111D",
          dim: "#03080F",
          bright: "#0B1727",
          "container-lowest": "#07111D",
          "container-low": "#0D1828",
          container: "#132338",
          "container-high": "#1B2F49",
          "container-highest": "#233A58",
        },
        primary: {
          DEFAULT: "#5B8CFF",
          dim: "#4374E4",
          container: "#132B57",
          on: "#FFFFFF",
          "on-container": "#DBE6FF",
        },
        secondary: {
          DEFAULT: "#2FC5A4",
          dim: "#19A78A",
          container: "#103D38",
          on: "#FFFFFF",
          "on-container": "#D8FFF4",
        },
        tertiary: {
          DEFAULT: "#8CA4C5",
          dim: "#6F87A8",
          container: "#24354C",
          on: "#F7FBFF",
          "on-container": "#E0EBF7",
        },
        error: {
          DEFAULT: "#FF6B7A",
          container: "#4A1621",
          on: "#FFFFFF",
          "on-container": "#FFDDE2",
        },
        editorial: {
          DEFAULT: "#99B6FF",
          dim: "#6F91FF",
          container: "#1C335C",
          ink: "#F5F7FB",
        },
        "on-surface": {
          DEFAULT: "#F4F7FB",
          variant: "#A8B7CB",
          muted: "#6F8098",
        },
        outline: {
          DEFAULT: "#283952",
          variant: "#18263A",
        },
      },
      fontFamily: {
        editorial: ["'Instrument Serif'", "'Iowan Old Style'", "Georgia", "serif"],
        display: ["'Bricolage Grotesque'", "'Inter'", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["'Inter'", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-lg": ["4rem", { lineHeight: "1.05", letterSpacing: "-0.02em", fontWeight: "600" }],
        "display-md": ["3rem", { lineHeight: "1.08", letterSpacing: "-0.02em", fontWeight: "600" }],
        "display-sm": ["2.25rem", { lineHeight: "1.12", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-lg": ["2rem", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-md": ["1.5rem", { lineHeight: "1.25", fontWeight: "600" }],
        "headline-sm": ["1.25rem", { lineHeight: "1.3", fontWeight: "600" }],
        "title-lg": ["1.125rem", { lineHeight: "1.35", fontWeight: "500" }],
        "title-md": ["1rem", { lineHeight: "1.4", fontWeight: "500" }],
        "body-lg": ["1rem", { lineHeight: "1.55" }],
        "body-md": ["0.875rem", { lineHeight: "1.55" }],
        "body-sm": ["0.8125rem", { lineHeight: "1.5" }],
        "label-lg": ["0.875rem", { lineHeight: "1.3", letterSpacing: "0.02em", fontWeight: "500" }],
        "label-md": ["0.75rem", { lineHeight: "1.3", letterSpacing: "0.06em", fontWeight: "500" }],
        "label-sm": ["0.6875rem", { lineHeight: "1.3", letterSpacing: "0.08em", fontWeight: "500" }],
      },
      borderRadius: {
        none: "0",
        sm: "0.125rem",
        DEFAULT: "0.25rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        hero: "28px",
      },
      boxShadow: {
        ambient: "0 20px 48px rgba(3, 8, 18, 0.34)",
        "ambient-lg": "0 28px 80px rgba(3, 8, 18, 0.46)",
        "glow-primary": "0 10px 26px rgba(91, 140, 255, 0.2)",
        "glow-secondary": "0 10px 26px rgba(47, 197, 164, 0.18)",
        "glow-tertiary": "0 10px 26px rgba(140, 164, 197, 0.14)",
      },
      backdropBlur: {
        glass: "24px",
      },
      transitionTimingFunction: {
        snappy: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
      animation: {
        "pulse-glow": "pulseGlow 2.4s ease-in-out infinite",
        "gradient-shift": "gradientShift 8s ease-in-out infinite",
        "ticker-scroll": "tickerScroll 40s linear infinite",
        "rise-in": "riseIn 700ms cubic-bezier(0.2,0.8,0.2,1) both",
        "fade-in": "fadeIn 600ms cubic-bezier(0.2,0.8,0.2,1) both",
        "slow-spin": "slowSpin 24s linear infinite",
        "flash-up": "flashUp 900ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "flash-down": "flashDown 900ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "1", filter: "brightness(1)" },
          "50%": { opacity: "0.85", filter: "brightness(1.2)" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        tickerScroll: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slowSpin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        flashUp: {
          "0%": { color: "#2FC5A4", textShadow: "0 0 24px rgba(47, 197, 164, 0.45)" },
          "100%": { color: "#F5F7FB", textShadow: "0 0 0 transparent" },
        },
        flashDown: {
          "0%": { color: "#FF6B7A", textShadow: "0 0 24px rgba(255, 107, 122, 0.42)" },
          "100%": { color: "#F5F7FB", textShadow: "0 0 0 transparent" },
        },
      },
    },
  },
  plugins: [],
};
