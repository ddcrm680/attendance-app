# Development

## Prerequisites

- PHP 8.3+
- Composer
- Node.js/npm
- SQLite

## Backend

    cd backend
    composer install
    copy .env.example .env
    php artisan key:generate
    php artisan migrate --seed
    php artisan serve

Set DB_DATABASE=database/database.sqlite for local SQLite. Keep secrets and provider credentials out of frontend variables.

## Frontend

    cd frontend
    npm install
    copy .env.local.example .env.local
    npm run dev

Set NEXT_PUBLIC_API_URL=http://localhost:8000/api (or the deployed API URL).

## Useful commands

Backend:

    php artisan migrate:fresh --seed
    vendor/bin/phpunit --do-not-cache-result
    php artisan queue:work
    php artisan schedule:run

Frontend:

    npx tsc --noEmit
    npm run build
    npm run start

The seeder creates deterministic local demo departments, offices, roles, employees, leave/WFH states, holidays, and attendance examples. Demo passwords and account emails are listed in the root README and are for local use only.
