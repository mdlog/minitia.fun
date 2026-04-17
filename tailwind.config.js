/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#09090B",
          dim: "#050505",
          bright: "#18181B",
          "container-lowest": "#09090B",
          "container-low": "#18181B",
          container: "#27272A",
          "container-high": "#3F3F46",
          "container-highest": "#52525B",
        },
        primary: {
          DEFAULT: "#2563EB",
          dim: "#1D4ED8",
          container: "#1E3A8A",
          on: "#FFFFFF",
          "on-container": "#DBEAFE",
        },
        secondary: {
          DEFAULT: "#10B981",
          dim: "#059669",
          container: "#064E3B",
          on: "#FFFFFF",
          "on-container": "#D1FAE5",
        },
        tertiary: {
          DEFAULT: "#64748B",
          dim: "#475569",
          container: "#1E293B",
          on: "#FFFFFF",
          "on-container": "#E2E8F0",
        },
        error: {
          DEFAULT: "#E11D48",
          container: "#4C0519",
          on: "#FFFFFF",
          "on-container": "#FFE4E6",
        },
        editorial: {
          DEFAULT: "#3B82F6",
          dim: "#2563EB",
          container: "#1E3A8A",
          ink: "#F1F5F9",
        },
        "on-surface": {
          DEFAULT: "#FAFAFA",
          variant: "#A1A1AA",
          muted: "#71717A",
        },
        outline: {
          DEFAULT: "#3F3F46",
          variant: "#27272A",
        },
      },
      fontFamily: {
        editorial: ["'Inter'", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["'Inter'", "ui-sans-serif", "system-ui", "sans-serif"],
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
      },
      boxShadow: {
        ambient: "0 10px 24px rgba(0, 0, 0, 0.25)",
        "ambient-lg": "0 20px 48px rgba(0, 0, 0, 0.4)",
        "glow-primary": "0 4px 12px rgba(0, 0, 0, 0.15)",
        "glow-secondary": "0 4px 12px rgba(0, 0, 0, 0.15)",
        "glow-tertiary": "0 4px 12px rgba(0, 0, 0, 0.15)",
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
      },
    },
  },
  plugins: [],
};
