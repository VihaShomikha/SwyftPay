# SwyftPay Frontend

Marketing website, developer documentation, and analytics dashboard for SwyftPay.

## Pages

| Route | Description |
| - | - |
| `/` | Landing page - hero, features, protocol flow, code examples, stats |
| `/docs` | Developer documentation - SDK, CLI, policy, trust scoring, adapters |
| `/dashboard` | Analytics dashboard - import logs, view spend analytics, trust scores, transaction history |

## Stack

- React 18 + TypeScript
- Vite 5
- Tailwind CSS 4
- Framer Motion (3D animations)
- Lucide React (SVG icons)
- React Router DOM

## Development

```bash
npm install
npm run dev        # Dev server on localhost:5173
npm run build      # Production build
npm run preview    # Preview production build
```

## Design

- **Font (headings):** Press Start 2P (pixel)
- **Font (body):** Space Grotesk (Google Fonts)
- **Font (code):** JetBrains Mono (Google Fonts)
- **Favicon:** `public/favicon.svg` (primary) and `public/favicon.png`
- **Colors:** Black (#050505), Cream Pink (#F5A0B1), Soft Purple (#B06AB3)
- **Background:** Grid mesh pattern
- **Components:** 3D perspective transforms, floating animations
