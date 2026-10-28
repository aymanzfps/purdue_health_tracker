# Purdue Health Tracker

Tells you what to eat at Purdue dining courts, and how much, based on your gym goal.
Pulls live menus and nutrition from Purdue Dining's public API.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## API

| Route | What it does |
|---|---|
| `GET /api/locations` | Dining courts and other Purdue dining locations |
| `GET /api/menu?location=Wiley&date=YYYY-MM-DD` | A day's menu with nutrition per item, plus the meal being served now |
| `POST /api/targets` `{ profile }` | Daily calorie and macro targets for a profile |
| `POST /api/recommend` `{ profile, location, meal?, date?, exclude?, lock? }` | The best plate for one meal: items, servings, hand-size portions, fit score |
| `POST /api/compare` `{ profile, meal, date? }` | Every dining court ranked by how well it fits the goal |

Goals: lean bulk, cut, recomp, maintain, strength, endurance, or custom macros.
See `src/lib/types.ts` for the `profile` shape.

## How it works

- `src/lib/purdue.ts`: fetches and caches Purdue menus and nutrition facts
- `src/lib/targets.ts`: daily targets (Mifflin-St Jeor BMR × activity, adjusted per goal and training day)
- `src/lib/optimizer.ts`: picks half-serving amounts with a small integer program to hit the meal's macros
- `src/lib/portion.ts`: converts serving sizes into fists, palms, thumbs and pieces
