# HomeNest

HomeNest is a modern, minimalist e-commerce application designed to help users plan and furnish their homes. Built with a clean Apple/IKEA-style aesthetic, it offers seamless browsing, a personalized profile, and an interactive Room Planner.

## Tech Stack
- **HTML5**: Semantic structure.
- **CSS3 (Vanilla)**: Custom design system, CSS variables for theming (Light/Dark mode), and fully responsive layout without external frameworks.
- **JavaScript (Vanilla)**: Modular, dependency-free frontend logic handling routing (SPA), state management, and UI interactions.
- **LocalStorage**: Client-side data persistence for carts, wishlists, saved Room Planner layouts, user profiles, and theme preferences.

## Project Structure

Here is a breakdown of the repository and what each file controls. If you need to edit a specific feature, look for the corresponding file below:

### Root Directory
- **`index.html`**: The single-page application (SPA) entry point. Contains the HTML structure for *all* pages (Home, Categories, Product Detail, Deals, Sellers, Cart, Wishlist, Profile, Planner).
- **`README.md`**: This file. Documentation for the project.
- **`context.md`**: A living document tracking the development context, features added, and project history.

### Styles (`/css/`)
- **`style.css`**: The global stylesheet. Contains:
  - CSS Variables (Colors, Typography, Spacing).
  - Reset and Base styles.
  - Component styles (Buttons, Cards, Navbars, Modals).
  - Page-specific layouts.
  - Dark mode overrides (`[data-theme="dark"]`).

### JavaScript Modules (`/js/`)
The JS is broken down into modules by feature. All are loaded in `index.html`.
- **`app.js`**: The core controller. Handles SPA routing (`navigateTo`), global initialization (`init`), Dark/Light mode, global search, countdown timers, and Auth/Seller Dashboard modal logic.
- **`store.js`**: The local database manager. Abstracts all `localStorage` operations (getting/setting cart items, wishlist, user profile, theme, and saved planner layouts).
- **`products.js`**: Handles the product grid rendering, the Product Detail View (`showProductDetail`), and the complex filtering logic (by Category, Price range, Seller type, Rating).
- **`sellers.js`**: Manages the rendering of the Sellers Directory and the detailed Seller Profile view (`showSellerDetail`) which lists a seller's specific products.
- **`cart.js`**: Manages Cart operations (adding items, updating quantities, removing items, calculating totals, and simulating checkout).
- **`wishlist.js`**: Manages the Wishlist (adding/removing items and rendering the wishlist grid).
- **`planner.js`**: The engine for the interactive Room Planner. Handles drag-and-drop, canvas rendering, furniture rotation/deletion, room resizing, and saving/loading layouts.
- **`reviews.js`**: Handles rendering customer reviews on product pages and adding new user reviews.

### Data (`/data/`)
- **`products.json`**: The mock database for products. Edit this file to add, remove, or modify products, their prices (in ₹), images, descriptions, and linked sellers.
- **`sellers.json`**: The mock database for sellers. Edit this file to update seller profiles, ratings, and locations.


## How to Run Locally
Because the app fetches local JSON files (`products.json`, `sellers.json`), it needs to be served via a local web server (opening `index.html` directly in the browser will cause CORS errors).

1. Open a terminal in the project directory.
2. Run `npx serve . -p 3000`
3. Visit `http://localhost:3000` in your browser.

## Customization Guide

- **Changing Colors/Fonts:** Open `css/style.css` and modify the `:root` variables at the very top.
- **Adding a Page:** 
  1. Add the HTML section in `index.html` with class `page` and an id (e.g., `id="page-about"`).
  2. Add a navigation link with `data-page="about"`.
  3. In `js/app.js`, add an `onPageEnter` case if you need JavaScript to run when the page loads.
- **Editing Products/Images:** Open `data/products.json`. Ensure image URLs are valid (currently using Unsplash).

