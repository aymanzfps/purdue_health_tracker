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
| `POST /api/recommend` `{ profile, location, meal?, date?, exclude?, lock? }` | The best plate for one meal: items, servings, hand-size portions, fit score. `location: "all"` mixes items from every dining court |
| `POST /api/compare` `{ profile, meal, date? }` | Every dining court ranked by how well it fits the goal |

Goals: lean bulk, cut, recomp, maintain, strength, endurance, or custom macros.
The profile also says which dining court meals you eat (any of breakfast, lunch, dinner)
and how many snacks; the day's targets are split across them.
See `src/lib/types.ts` for the `profile` shape.

## Pages

- **Today**: pick a dining court (or "Best across all") and a meal to get a sized plate
- **Compare**: every court ranked for a meal
- **Day plan**: your meals for the day, each from the best court or one you choose, with day totals
- **Goals**: stats, goal, meals, and food preferences

## Roadmap

- Workout tracking: log workouts through the week and see progress (planned as its own section)
- Apple Watch sync via an iOS Shortcut
- Meal logging and accounts

## How it works

- `src/lib/purdue.ts`: fetches and caches Purdue menus and nutrition facts
- `src/lib/targets.ts`: daily targets (Mifflin-St Jeor BMR × activity, adjusted per goal and training day)
- `src/lib/optimizer.ts`: picks half-serving amounts with a small integer program to hit the meal's macros
- `src/lib/portion.ts`: converts serving sizes into fists, palms, thumbs and pieces
