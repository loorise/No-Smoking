# 🚬 Smoke Tracker — Telegram Mini App

Трекер сигарет как Telegram Mini App на React + Vite.

## Стек

- **React 18** + **React Router 6** + **Framer Motion**
- **Vite 5** (сборка)
- **Telegram Web App SDK** (подключён через CDN)
- Чистый CSS (без UI-библиотек)
- Шрифты: **Space Mono** (таймер) + **Syne** (интерфейс)

## Supabase (синхронизация между устройствами)

1. Создай проект на [supabase.com](https://supabase.com)
2. В **SQL Editor** выполни скрипт `supabase/schema.sql`
3. Скопируй `.env.example` → `.env` и заполни:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. Перезапусти dev-сервер

Без `.env` приложение работает только с **localStorage** (как раньше).

Синхронизация привязана к Telegram user id. Вне Telegram используется `test_user`.

## Telegram Bot (Telegraf)

```bash
cd bot
npm install
```

В корневом `.env` добавь:

```env
BOT_TOKEN=your-bot-token-from-BotFather
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

Запуск:

```bash
cd bot
npm start
```

Команды: `/start` — меню с кнопками «Покурил», «Сколько не курил», «История».  
`user_id` в Supabase = Telegram `user.id` (как в Mini App).

## Запуск локально (Mini App)

```bash
npm install
npm run dev
```

## Сборка

```bash
npm run build
# Статика появится в папке dist/
```

## Деплой в Telegram

1. Задеплой папку `dist/` на любой статик-хостинг:
   - [Vercel](https://vercel.com) — `vercel --prod`
   - [Netlify](https://netlify.com) — перетащи папку `dist`
   - GitHub Pages — Actions или ручной пуш
   - Любой nginx/caddy/apache

2. Открой [@BotFather](https://t.me/BotFather) → `/newbot` → создай бота

3. `/mybots` → выбери бота → **Bot Settings** → **Menu Button** / **Web App**

4. Укажи URL задеплоенного приложения

5. Profit! 🎉

## Структура проекта

```
src/
├── hooks/
│   └── useSmoke.js       # Таймер, события, localStorage + Supabase
├── lib/
│   ├── supabase.js       # Клиент и API: addSmokingEvent, getSmokingEvents
│   ├── telegramAuth.js   # Telegram WebApp SDK: user id для Supabase
│   └── userId.js         # Реэкспорт getUserId из telegramAuth
├── pages/
│   ├── Home.jsx          # Главная (таймер + кнопка)
│   ├── Home.css
│   ├── History.jsx       # История по дням
│   └── History.css
├── App.jsx               # Роутинг + таббар
├── App.css
├── main.jsx              # Точка входа + инит TG SDK
└── index.css             # Глобальные переменные и стили
```

## Функции

- ⏱ Таймер считает время с последней сигареты (сохраняется в localStorage)
- 🚬 Счётчик сигарет за день
- 🎨 Цвет таймера меняется: красный → жёлтый → зелёный
- 📋 История с навигацией по дням
- 📳 Haptic feedback при сбросе (если поддерживается Telegram)
- 💾 localStorage как fallback + Supabase для синхронизации
