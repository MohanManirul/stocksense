# StockSense

Inventory, sales and smart reordering for small shops.

StockSense tracks products, stock movements, sales and purchase orders, and forecasts each product's daily demand from its sales history to suggest when and how much to reorder.

## Features

- **Dashboard**: stock and sales overview
- **Products, categories and suppliers**, with stock levels and reorder levels
- **Sales**: record sales; stock is deducted automatically
- **Purchase orders**: order from suppliers and receive stock (see [Purchase order workflow](#purchase-order-workflow))
- **Demand forecasts**: a weekly-seasonal demand model, back-tested against a moving average, that suggests reorder points and order quantities from each supplier's lead time
- **Users, roles and permissions** (via `spatie/laravel-permission`)
- **Demo mode**: one-click sign-in as any seeded account

## Purchase order workflow

The workflow is implemented in `PurchaseOrderService`, and `PurchaseOrderStatus::allowedTransitions()` defines which status changes are allowed.

```
draft ──place──► ordered ──receive──► received
  │                 │
  └──cancel──► cancelled ◄──cancel──┘
```

- Only drafts can be edited or deleted.
- Placing an order requires at least one item. It sets `ordered_at`, and sets `expected_at` from the supplier's lead time if none was given.
- Receiving locks the order and its products, adds stock through the ledger, and records who received it. An order can't be received twice.
- A draft or a placed order can be cancelled. Stock doesn't change.
- Any other status change is rejected with a validation error.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Laravel 13, PHP 8.4+ |
| Frontend | Inertia.js v3, React 19, TypeScript, Tailwind CSS v4 |
| Build tool | Vite 8 |
| Database | PostgreSQL |
| Local environment | Docker via Laravel Sail (optional) |

## Requirements

You can run the project in one of two ways.

**Option A: with Docker (recommended).** You only need:

- Docker with the Compose plugin, either of:
  - [Docker Engine](https://docs.docker.com/engine/install/ubuntu/) installed directly on Linux, or inside WSL 2 Ubuntu on Windows (the setup this project was built with)
  - [Docker Desktop](https://www.docker.com/products/docker-desktop/) on Windows or macOS (on Windows, enable WSL 2 integration)
- Git

On Windows, keep the project inside the WSL file system (for example `~/projects/stocksense`), not under `/mnt/c/...`, or file access will be very slow.

**Option B: without Docker.** You need:

- PHP **8.4.1 or newer**, with the `pdo_pgsql`, `mbstring`, `intl`, `bcmath`, `fileinfo`, `xml`, `ctype`, `tokenizer`, `openssl`, `curl` and `zip` extensions
- [Composer](https://getcomposer.org/) 2
- [Node.js](https://nodejs.org/) **22 LTS** or newer, with npm
- PostgreSQL 14 or newer
- Git

> Some locked Composer dependencies require PHP 8.4.1 or newer, so `composer install` fails on PHP 8.3.

### Installing the requirements on Ubuntu

Docker Desktop and WSL are not needed on Linux. Pick the commands for the option you chose.

**For Option A: Docker Engine**

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker            # or log out and back in
docker run hello-world   # check that Docker works
```

Don't run `docker` or `sail` with `sudo`, or files in the project end up owned by root.

**For Option B: PHP, Composer, Node.js and PostgreSQL**

```bash
# PHP 8.4. Ubuntu 24.04 and older ship PHP 8.3, so add the ondrej/php PPA first.
sudo add-apt-repository -y ppa:ondrej/php
sudo apt update
sudo apt install -y php8.4-cli php8.4-pgsql php8.4-mbstring php8.4-intl php8.4-bcmath \
    php8.4-xml php8.4-curl php8.4-zip unzip git

# Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL, with a database role for your Linux user
sudo apt install -y postgresql
sudo -u postgres createuser --superuser $USER
sudo -u postgres psql -c "ALTER USER $USER PASSWORD 'secret';"
```

Check the versions:

```bash
php -v && composer -V && node -v && psql --version
```

---

## Installation: Option A (Docker / Laravel Sail)

### 1. Clone the repository

```bash
git clone https://github.com/MohanManirul/stocksense.git
cd stocksense
```

### 2. Install PHP dependencies

Sail lives inside `vendor/`, so the first install runs in a throwaway Composer container:

```bash
docker run --rm \
    -u "$(id -u):$(id -g)" \
    -v "$(pwd):/var/www/html" \
    -w /var/www/html \
    laravelsail/php84-composer:latest \
    composer install --ignore-platform-reqs
```

### 3. Create the environment file

```bash
cp .env.example .env
```

Open `.env` and set the database section for Sail's PostgreSQL container:

```env
APP_URL=http://localhost

DB_CONNECTION=pgsql
DB_HOST=pgsql
DB_PORT=5432
DB_DATABASE=stocksense
DB_USERNAME=sail
DB_PASSWORD=password
```

### 4. Start the containers

```bash
./vendor/bin/sail up -d
```

The first run builds the app image, which takes a few minutes.

> **Tip:** add an alias so you can type `sail` instead of `./vendor/bin/sail`:
>
> ```bash
> alias sail='sh $([ -f sail ] && echo sail || echo vendor/bin/sail)'
> ```

### 5. Set up the application

```bash
sail artisan key:generate
sail artisan migrate --seed
sail npm install
sail npm run build
```

### 6. Open the app

Visit **http://localhost/admin/login**.

The `vite` container runs the Vite dev server with hot reload, so frontend changes show up immediately.

To stop the containers:

```bash
sail down
```

---

## Installation: Option B (without Docker)

### 1. Clone and install dependencies

```bash
git clone https://github.com/MohanManirul/stocksense.git
cd stocksense
composer install
npm install
```

### 2. Create a PostgreSQL database

```bash
createdb stocksense
```

Or create the database with pgAdmin or `psql`.

### 3. Configure the environment

```bash
cp .env.example .env
php artisan key:generate
```

Edit `.env`:

```env
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=stocksense
DB_USERNAME=your_postgres_user
DB_PASSWORD=your_postgres_password
```

### 4. Migrate and seed

```bash
php artisan migrate --seed
```

### 5. Run the app

```bash
composer run dev
```

This starts the Laravel server and the Vite dev server together. If you prefer, run them in two terminals:

```bash
php artisan serve
npm run dev
```

Visit **http://localhost:8000/admin/login**.

---

## Demo data and login

`php artisan migrate --seed` creates:

- the roles and permissions
- a **Super Admin** account
- sample categories, suppliers and products
- **90 days of sales and purchase history**, so the forecasts have data to work with

| Email | Password |
|---|---|
| `admin@stocksense.test` | `password` |

With `APP_DEMO=true` in `.env`, the login page lists every account with a **Use** button that signs in without a password. Set `APP_DEMO=false` to turn this off. Never enable it on a public server with real data.

To reset the database and seed it again:

```bash
php artisan migrate:fresh --seed        # or: sail artisan migrate:fresh --seed
```

---

## Running tests

Tests use a separate database named `testing`, as configured in `phpunit.xml`.

- **Sail** creates the `testing` database automatically:

  ```bash
  sail artisan test
  ```

- **Without Docker**, create it first:

  ```bash
  createdb testing
  php artisan test
  ```

## Code style

PHP code is formatted with [Laravel Pint](https://laravel.com/docs/pint):

```bash
vendor/bin/pint
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Your Composer dependencies require a PHP version ">= 8.4.1"` | Upgrade PHP to 8.4.1 or newer. |
| `could not find driver` | Enable the `pdo_pgsql` PHP extension. |
| `Unable to locate file in Vite manifest` | Run `npm run build`, or keep `npm run dev` running. |
| Blank page whose assets load from `localhost:5173` | The Vite dev server stopped but `public/hot` remains. Run `npm run dev` again, or delete `public/hot`. |
| `EACCES: permission denied` on `public/build` | The folder was created by root, probably from an earlier build run as root or with `sudo`. Run `sudo chown -R $USER:$USER public/build`. |
| `SQLSTATE[08006] connection refused` | Check that PostgreSQL is running and that `DB_HOST` is correct: `pgsql` with Sail, `127.0.0.1` without Docker. |
| Port 80 or 5432 already in use (Sail) | Set `APP_PORT=8080` or `FORWARD_DB_PORT=5433` in `.env`, then run `sail up -d` again. |
| `.env` changes have no effect | Run `php artisan config:clear`. |

## License

Open-sourced under the [MIT license](https://opensource.org/licenses/MIT).
