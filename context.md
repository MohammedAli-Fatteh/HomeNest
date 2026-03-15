# HomeNest Development Context

This document maintains the high-level context, historical changes, and current state of the HomeNest project.

## Initial Request
The USER requested a minimalist, modern e-commerce website called "HomeNest" specializing in home furniture and decor. 

### Core Requirements:
- **Style**: Clean, Apple/IKEA-style design, soft neutral colors, dynamic hover effects, and smooth transitions.
- **Features**: Product browsing, shopping cart, wishlist, and an interactive drag-and-drop Room Planner.
- **Tech Stack**: HTML, CSS, JavaScript (Vanilla), with LocalStorage for persistence. No external frameworks like React or Tailwind were used to keep it lightweight.

---

## Phase 1: Foundation (V1)
- Set up the file structure (`css/`, `js/`, `data/`).
- Built the global `style.css` with CSS variables for dynamic Dark/Light mode switching.
- Created `index.html` serving as a Single Page Application (SPA).
- Populated `products.json` and `sellers.json` with initial mock data.
- Built JS modules for routing (`app.js`), storage (`store.js`), and product display (`products.js`).

## Phase 2: Feature Implementation
- **Cart & Wishlist**: Implemented full functionality in `cart.js` and `wishlist.js` with LocalStorage.
- **Room Planner**: Created a 2D canvas-based planner in `planner.js` allowing users to drag furniture onto a grid, scale room sizes, and save layouts.
- **Global Search**: Added a `Ctrl+K` global search overlay.
- **Filtering**: Added multi-faceted filtering on the Categories page (Price, Rating, Seller Type).

## Phase 3: Localization & UI Polish
*User requested Indian localization and visual fixes.*
- **Indian Pricing**: Updated all JSON data and Javascript formatting to use the Indian Rupee (₹). Adjusted price filter max ranges from `8,000` to `80,000`.
- **Seller Locations**: Updated seller mock data to Indian cities (Bengaluru, Mumbai, Jodhpur, etc.).
- **Marquee Speed**: Slowed down the customer review marquee in CSS so it is readable.
- **Auth & Seller Dashboards**: Built modals for User Login, Registration, and Seller Registration. Added a specific Seller Dashboard tab inside the Profile page.
- **Data Deletion**: Fixed a bug where clearing data didn't redirect or clear state correctly.
- **UI Fixes**: Prevented the "Back" button on product detail pages from overlapping with the Luxury badges.
- **Planner UX**: Added keyboard support (`Delete`/`Backspace`) to remove planner items, and mouse `wheel` support to rotate items smoothly.

## Phase 4: Data Accuracy
*User requested accurate, non-generic imagery.*
- **Images**: Swapped out generic room images for specific product photography via Unsplash. Ensured no photos contained humans or animals.
- **Dynamic Category Counts**: Removed hardcoded "2 items" tags on the homepage and built an `updateCategoryCounts()` function in `app.js` to dynamically parse the JSON and display the correct stock count per room category.

---

## Current Status
The application is fully functional, complete, and running locally. All major bugs (overlaps, data clearing, image mismatches) have been resolved.

## Future / Pending Work
*(Add notes here if new feature requests arrive)*
- None at the moment.
