/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // ── Colors ──────────────────────────────────────────────────────────────
      colors: {
        // Background layers
        deep:     "#0A0A0A",
        card:     "#141414",
        elevated: "#1A1A1A",
        // Borders (also usable as bg/text)
        subtle:    "#252525",
        prominent: "#333333",
        // Text
        primary:   "#FFFFFF",
        secondary: "#A1A1A1",
        tertiary:  "#666666",
        // Server identity colors
        server: {
          1: "#3B82F6",
          2: "#8B5CF6",
          3: "#10B981",
        },
      },

      // ── Typography ───────────────────────────────────────────────────────────
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
      },
      letterSpacing: {
        tighter: "-0.02em",
        tight:   "-0.01em",
      },

      // ── Border radius ────────────────────────────────────────────────────────
      borderRadius: {
        button: "0.375rem",
        card:   "0.5rem",
        panel:  "0.75rem",
        badge:  "9999px",
      },

      // ── Shadows ──────────────────────────────────────────────────────────────
      boxShadow: {
        card:       "0 4px 6px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)",
        elevated:   "0 10px 15px rgba(0,0,0,0.4), 0 4px 6px rgba(0,0,0,0.3)",
        glow:       "0 0 20px rgba(59,130,246,0.4)",
        "glow-sm":  "0 0 12px rgba(59,130,246,0.25)",
        "glow-green":"0 0 16px rgba(16,185,129,0.35)",
        "glow-red":  "0 0 16px rgba(239,68,68,0.35)",
        "glow-amber":"0 0 16px rgba(245,158,11,0.35)",
        "inner-subtle": "inset 0 1px 0 rgba(255,255,255,0.04)",
      },

      // ── Animations ───────────────────────────────────────────────────────────
      animation: {
        "fade-in":    "fadeIn 150ms ease-out",
        "fade-out":   "fadeOut 150ms ease-out",
        "slide-down": "slideDown 200ms cubic-bezier(0.16,1,0.3,1)",
        "slide-up":   "slideUp 200ms cubic-bezier(0.16,1,0.3,1)",
        "scale-in":   "scaleIn 150ms cubic-bezier(0.16,1,0.3,1)",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "shimmer":    "shimmer 1.5s ease-in-out infinite",
        "shake":      "shake 0.4s ease-in-out",
        "crown-in":   "crownIn 400ms cubic-bezier(0.34,1.56,0.64,1)",
        // Preserve existing
        "travel":     "travelDown 0.45s ease-in infinite",
        "hc-ping":    "hcPing 1s ease-out",
      },
      keyframes: {
        fadeIn:     { "0%": { opacity: "0" },                                      "100%": { opacity: "1" } },
        fadeOut:    { "0%": { opacity: "1" },                                      "100%": { opacity: "0" } },
        slideDown:  { "0%": { opacity: "0", transform: "translateY(-8px)" },       "100%": { opacity: "1", transform: "translateY(0)" } },
        slideUp:    { "0%": { opacity: "0", transform: "translateY(8px)" },        "100%": { opacity: "1", transform: "translateY(0)" } },
        scaleIn:    { "0%": { opacity: "0", transform: "scale(0.95)" },            "100%": { opacity: "1", transform: "scale(1)" } },
        glowPulse:  { "0%, 100%": { boxShadow: "0 0 8px rgba(59,130,246,0.15)" }, "50%": { boxShadow: "0 0 24px rgba(59,130,246,0.5)" } },
        shimmer:    { "0%": { backgroundPosition: "-200% 0" },                     "100%": { backgroundPosition: "200% 0" } },
        shake:      {
          "0%, 100%": { transform: "translateX(0)" },
          "20%":      { transform: "translateX(-3px)" },
          "40%":      { transform: "translateX(3px)" },
          "60%":      { transform: "translateX(-3px)" },
          "80%":      { transform: "translateX(3px)" },
        },
        crownIn:    { "0%": { opacity: "0", transform: "translateY(-8px) scale(0.6)" }, "100%": { opacity: "1", transform: "translateY(0) scale(1)" } },
        // Preserve existing
        travelDown: { "0%": { transform: "translateY(0px)", opacity: "1" }, "80%": { transform: "translateY(28px)", opacity: "0.8" }, "100%": { transform: "translateY(36px)", opacity: "0" } },
        hcPing:     { "0%": { transform: "scale(1)", opacity: "1" }, "70%": { transform: "scale(1.8)", opacity: "0" }, "100%": { transform: "scale(1.8)", opacity: "0" } },
      },

      // ── Transitions ──────────────────────────────────────────────────────────
      transitionTimingFunction: {
        "out-expo":   "cubic-bezier(0.16, 1, 0.3, 1)",
        "spring":     "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },

      // ── Background images ─────────────────────────────────────────────────────
      backgroundImage: {
        "gradient-blue-purple": "linear-gradient(135deg, #3B82F6, #8B5CF6)",
        "gradient-radial-glow": "radial-gradient(ellipse at center, rgba(59,130,246,0.15) 0%, transparent 70%)",
        "shimmer-bar":          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)",
      },
    },
  },
  plugins: [],
};
