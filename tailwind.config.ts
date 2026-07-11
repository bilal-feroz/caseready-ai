import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "on-primary-container": "#d380be",
        "surface": "#f7f9ff",
        "surface-variant": "#d9e4f0",
        "inverse-primary": "#fface8",
        "inverse-on-surface": "#e7f2fe",
        "on-surface": "#131d25",
        "surface-container-lowest": "#ffffff",
        "outline": "#82737c",
        "secondary-fixed-dim": "#e5c281",
        "secondary": "#755a24",
        "surface-dim": "#d1dbe7",
        "on-primary-fixed": "#3a0032",
        "surface-container": "#e5effb",
        "surface-tint": "#8d447d",
        "primary-container": "#5a174f",
        "tertiary": "#002320",
        "surface-container-low": "#ecf4ff",
        "on-tertiary-fixed": "#00201e",
        "on-error": "#ffffff",
        "primary-fixed-dim": "#fface8",
        "on-secondary-fixed": "#271900",
        "tertiary-fixed": "#9af2ea",
        "surface-container-high": "#dfe9f6",
        "background": "#f7f9ff",
        "primary-fixed": "#ffd7f0",
        "on-secondary-container": "#785d27",
        "on-primary-fixed-variant": "#712c64",
        "tertiary-fixed-dim": "#7ed5ce",
        "on-background": "#131d25",
        "on-tertiary-container": "#51a9a2",
        "outline-variant": "#d4c1cc",
        "on-tertiary": "#ffffff",
        "secondary-fixed": "#ffdea5",
        "surface-bright": "#f7f9ff",
        "inverse-surface": "#27313b",
        "error-container": "#ffdad6",
        "on-surface-variant": "#50434b",
        "on-tertiary-fixed-variant": "#00504c",
        "on-secondary-fixed-variant": "#5b430e",
        "secondary-container": "#fdd896",
        "error": "#ba1a1a",
        "surface-container-highest": "#d9e4f0",
        "on-primary": "#ffffff",
        "primary": "#3f0037",
        "on-error-container": "#93000a",
        "on-secondary": "#ffffff",
        "tertiary-container": "#003a37"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        "command_bar_height": "68px",
        "grid_gutter": "24px",
        "unit": "8px",
        "container_padding": "24px",
        "stack_sm": "8px",
        "stack_md": "16px",
        "stack_lg": "24px",
        "nav_rail_width": "232px"
      },
      fontFamily: {
        "display-lg": ["IBM Plex Sans", "sans-serif"],
        "headline-md": ["IBM Plex Sans", "sans-serif"],
        "headline-sm": ["IBM Plex Sans", "sans-serif"],
        "title-md": ["IBM Plex Sans", "sans-serif"],
        "body-md": ["IBM Plex Sans", "sans-serif"],
        "caption": ["IBM Plex Sans", "sans-serif"],
        "body-lg": ["IBM Plex Sans", "sans-serif"],
        "label-md": ["IBM Plex Sans", "sans-serif"]
      },
      fontSize: {
        "display-lg": ["32px", { "lineHeight": "40px", "letterSpacing": "-0.02em", "fontWeight": "600" }],
        "headline-md": ["24px", { "lineHeight": "32px", "letterSpacing": "-0.01em", "fontWeight": "600" }],
        "headline-sm": ["20px", { "lineHeight": "28px", "fontWeight": "600" }],
        "title-md": ["16px", { "lineHeight": "24px", "fontWeight": "500" }],
        "body-md": ["14px", { "lineHeight": "20px", "fontWeight": "400" }],
        "caption": ["12px", { "lineHeight": "16px", "fontWeight": "400" }],
        "body-lg": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
        "label-md": ["12px", { "lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "600" }]
      }
    }
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/container-queries"),
  ],
};

export default config;
