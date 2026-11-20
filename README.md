Hello Travelers! Welcome to the place where you can go on about your favorite RPG’s. Leave an review,  comments, likes, and especially ratings for both good and bad games. We’d love to hear from your travels!

## Running locally

Start Apache and MySQL from the XAMPP Control Panel, then open the site at:

`http://127.0.0.1/WEB/Html%20pages/Landing-page.html`

Do not use Live Server on port 5500 or 5501 for this project. Live Server cannot execute PHP, and submitting any PHP form or review endpoint through that server will return HTTP 405.

Features:
- View many RPGs and see the trending
- Rate and comments
- Creating and Login
- Rpg themed UI (mainly fantasy/medieval)
- See the trailers and can direct yoou to steam/especially

Catalog and reviews:
- The RPG catalog is loaded from RAWG, not stored in the MySQL database. The home page loads 40 results per request, shows 8 per catalog page and 4 per trending page, and fetches later RAWG pages as needed. The featured quest rotates automatically.
- Game details show the official Steam logo when available (with a title wordmark fallback) and play RAWG or Steam trailers in an embedded player.
- The `user` and `reviews` tables store accounts and reviews. Run `php/review-likes.sql` once against `tj_db` when setting up a fresh database to enable review likes.
- Reviews are public and can be sorted by newest, most liked, or highest XP. Liking a review requires signing in.