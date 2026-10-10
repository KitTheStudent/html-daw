document.addEventListener("DOMContentLoaded", loadGames);

const GAMES_PER_PAGE = 8;
const TRENDING_GAMES_PER_PAGE = 4;
let featuredGames = [];
let featuredIndex = 0;
let featuredTimer = null;
let featuredPaused = false;
let catalogGames = [];
let builtInCatalog = [];
let catalogNextUrl = null;
let catalogTotal = 0;
let catalogPage = 0;
let trendingPage = 0;
let catalogControlsBound = false;

async function loadGames() {
    builtInCatalog = window.RPG_CATALOG || [];
    renderCatalog(builtInCatalog, builtInCatalog, null, builtInCatalog.length, 0);

    if (!window.RAWG_API_KEY) return;

    try {
        const url = new URL("https://api.rawg.io/api/games");
        url.search = new URLSearchParams({
            key: window.RAWG_API_KEY,
            genres: "role-playing-games-rpg",
            ordering: "-rating",
            page_size: "40"
        });
        const response = await fetch(url);
        if (!response.ok) throw new Error(`RAWG request failed (${response.status}).`);
        const data = await response.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
            renderCatalog(
                data.results.map(mapRawgGame),
                builtInCatalog,
                data.next,
                Number(data.count) || data.results.length,
                0
            );
        }
    } catch (error) {
        console.error("Could not load the RAWG catalog; using the built-in catalog instead.", error);
    }
}

function mapRawgGame(game) {
    return {
        id: String(game.id),
        name: game.name,
        rating: game.rating,
        background: game.background_image,
        genres: (game.genres || []).map(genre => genre.name).join(", "),
        released: game.released || "N/A",
        description: ""
    };
}

function renderCatalog(games, fallbackGames, nextUrl, total, page) {
    const newFeaturedGames = featuredGames !== games;
    const currentFeaturedId = featuredGames[featuredIndex]?.id;
    catalogGames = games;
    builtInCatalog = fallbackGames;
    catalogNextUrl = nextUrl;
    catalogTotal = total;
    catalogPage = page;
    if (newFeaturedGames) {
        trendingPage = 0;
        featuredGames = games;
        const preservedFeaturedIndex = games.findIndex(game => game.id === currentFeaturedId);
        featuredIndex = preservedFeaturedIndex >= 0 ? preservedFeaturedIndex : 0;
        renderFeatured();
        setupFeaturedControls();
    }

    if (!catalogControlsBound) {
        document.getElementById("catalog-previous").addEventListener("click", showPreviousCatalogPage);
        document.getElementById("catalog-next").addEventListener("click", showNextCatalogPage);
        document.getElementById("trending-previous").addEventListener("click", showPreviousTrendingPage);
        document.getElementById("trending-next").addEventListener("click", showNextTrendingPage);
        catalogControlsBound = true;
    }

    const selectedGenre = new URLSearchParams(window.location.search).get("genre");
    let matchingGames = selectedGenre
        ? games.filter(game => genreMatches(game.genres, selectedGenre))
        : games;
    let usingBuiltInCategoryResults = false;

    if (selectedGenre && matchingGames.length === 0) {
        matchingGames = fallbackGames.filter(game => genreMatches(game.genres, selectedGenre));
        usingBuiltInCategoryResults = matchingGames.length > 0;
        if (usingBuiltInCategoryResults) catalogNextUrl = null;
    }

    const filterStatus = document.getElementById("catalog-filter-status");
    if (selectedGenre) {
        const categoryName = selectedGenre.split("-").map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(" ");
        filterStatus.textContent = matchingGames.length
            ? `Showing ${matchingGames.length} ${matchingGames.length === 1 ? "game" : "games"} in ${categoryName}${usingBuiltInCategoryResults ? " from the built-in catalog" : ""}.`
            : `No games in ${categoryName} are currently in the loaded catalog.`;
    } else {
        filterStatus.textContent = "";
    }

    const pageStart = catalogPage * GAMES_PER_PAGE;
    const pageGames = matchingGames.slice(pageStart, pageStart + GAMES_PER_PAGE);
    renderTrendingPage(matchingGames);
    renderGameCards(document.getElementById("rpg-grid"), pageGames);
    updateCatalogControls(matchingGames.length);
}

function renderTrendingPage(games) {
    const start = trendingPage * TRENDING_GAMES_PER_PAGE;
    renderGameCards(
        document.getElementById("trending-grid"),
        games.slice(start, start + TRENDING_GAMES_PER_PAGE)
    );
    document.getElementById("trending-previous").disabled = trendingPage === 0;
    document.getElementById("trending-next").disabled =
        start + TRENDING_GAMES_PER_PAGE >= games.length;
    document.getElementById("trending-position").textContent = games.length
        ? `Showing ${start + 1}–${Math.min(start + TRENDING_GAMES_PER_PAGE, games.length)} of ${games.length}`
        : "No games to display";
}

function showNextTrendingPage() {
    const games = getFilteredGames(new URLSearchParams(window.location.search).get("genre"));
    if ((trendingPage + 1) * TRENDING_GAMES_PER_PAGE >= games.length) return;
    trendingPage++;
    renderTrendingPage(games);
}

function showPreviousTrendingPage() {
    if (trendingPage === 0) return;
    trendingPage--;
    renderTrendingPage(getFilteredGames(new URLSearchParams(window.location.search).get("genre")));
}

function setupFeaturedControls() {
    if (featuredTimer) clearInterval(featuredTimer);

    const controls = document.querySelector(".featured-controls");
    const toggle = document.getElementById("featured-toggle");
    if (!controls.dataset.bound) {
        document.getElementById("featured-prev").addEventListener("click", () => moveFeatured(-1));
        document.getElementById("featured-next").addEventListener("click", () => moveFeatured(1));
        toggle.addEventListener("click", () => setFeaturedPaused(!featuredPaused));
        controls.addEventListener("pointerenter", () => setFeaturedPaused(true));
        controls.addEventListener("pointerleave", () => setFeaturedPaused(false));
        controls.addEventListener("focusin", () => setFeaturedPaused(true));
        controls.addEventListener("focusout", event => {
            if (!controls.contains(event.relatedTarget)) setFeaturedPaused(false);
        });
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) setFeaturedPaused(true);
            else if (!controls.matches(":hover") && !controls.contains(document.activeElement)) setFeaturedPaused(false);
        });
        controls.dataset.bound = "true";
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reducedMotion) {
        featuredPaused = false;
        featuredTimer = setInterval(() => {
            if (!featuredPaused) moveFeatured(1);
        }, 6000);
    } else {
        featuredPaused = true;
    }
    updateFeaturedToggle();
}

function setFeaturedPaused(paused) {
    featuredPaused = paused;
    updateFeaturedToggle();
}

function updateFeaturedToggle() {
    const toggle = document.getElementById("featured-toggle");
    toggle.textContent = featuredPaused ? "Play" : "Pause";
    toggle.setAttribute("aria-pressed", String(featuredPaused));
}

function moveFeatured(direction) {
    if (featuredGames.length < 2) return;
    featuredIndex = (featuredIndex + direction + featuredGames.length) % featuredGames.length;
    renderFeatured();
}

async function showNextCatalogPage() {
    const selectedGenre = new URLSearchParams(window.location.search).get("genre");
    const currentGames = getFilteredGames(selectedGenre);
    if ((catalogPage + 1) * GAMES_PER_PAGE < currentGames.length) {
        catalogPage++;
        renderCatalog(catalogGames, builtInCatalog, catalogNextUrl, catalogTotal, catalogPage);
        return;
    }

    if (!catalogNextUrl) return;

    const nextButton = document.getElementById("catalog-next");
    const loadStatus = document.getElementById("catalog-load-status");
    nextButton.disabled = true;
    nextButton.textContent = "Loading...";
    loadStatus.textContent = "";
    try {
        const response = await fetch(catalogNextUrl);
        if (!response.ok) throw new Error(`RAWG page request failed (${response.status}).`);
        const data = await response.json();
        const existingIds = new Set(catalogGames.map(game => game.id));
        const nextGames = (data.results || []).map(mapRawgGame).filter(game => !existingIds.has(game.id));
        const combinedGames = catalogGames.concat(nextGames);
        const loadedFilteredCount = selectedGenre
            ? combinedGames.filter(game => genreMatches(game.genres, selectedGenre)).length
            : combinedGames.length;

        if (loadedFilteredCount <= catalogPage * GAMES_PER_PAGE && data.next) {
            catalogGames = combinedGames;
            catalogNextUrl = data.next;
            await showNextCatalogPage();
            return;
        }

        const nextPage = Math.floor(loadedFilteredCount / GAMES_PER_PAGE) > catalogPage
            ? catalogPage + 1
            : catalogPage;
        renderCatalog(combinedGames, builtInCatalog, data.next, Number(data.count) || catalogTotal, nextPage);
    } catch (error) {
        console.error("Could not load the next game catalog page.", error);
        loadStatus.textContent = "Could not load more games. Please try again.";
    } finally {
        nextButton.textContent = "Next games";
        updateCatalogControls(getFilteredGames(selectedGenre).length);
    }
}

function showPreviousCatalogPage() {
    if (catalogPage === 0) return;
    catalogPage--;
    renderCatalog(catalogGames, builtInCatalog, catalogNextUrl, catalogTotal, catalogPage);
}

function getFilteredGames(genre) {
    if (!genre) return catalogGames;
    const filtered = catalogGames.filter(game => genreMatches(game.genres, genre));
    return filtered.length
        ? filtered
        : builtInCatalog.filter(game => genreMatches(game.genres, genre));
}

function updateCatalogControls(visibleCount) {
    const previous = document.getElementById("catalog-previous");
    const next = document.getElementById("catalog-next");
    const position = document.getElementById("catalog-position");
    const start = catalogPage * GAMES_PER_PAGE;
    const end = Math.min(start + GAMES_PER_PAGE, visibleCount);

    previous.disabled = catalogPage === 0;
    next.disabled = end >= visibleCount && !catalogNextUrl;
    if (!visibleCount) {
        position.textContent = "No games to display";
    } else {
        const selectedGenre = new URLSearchParams(window.location.search).get("genre");
        const totalText = selectedGenre
            ? `${visibleCount} matching games loaded`
            : `${visibleCount} games loaded${catalogNextUrl ? ` (${catalogTotal} in RAWG)` : ""}`;
        position.textContent = `Showing ${start + 1}–${end} of ${totalText}`;
    }
}

function renderFeatured() {
    const game = featuredGames[featuredIndex];
    if (!game) return;

    const featuredImage = document.getElementById("featured-image");
    const title = document.getElementById("featured-title");
    const description = document.getElementById("featured-description");
    const button = document.getElementById("featured-btn");
    const position = document.getElementById("featured-position");

    featuredImage.src = game.background || "";
    featuredImage.hidden = !game.background;
    featuredImage.alt = game.background ? `${game.name} artwork` : "";
    title.textContent = game.name;
    description.textContent = game.description || `Discover ${game.name}, rated ${game.rating ?? "N/A"} out of 5.`;
    button.href = `game.html?id=${encodeURIComponent(game.id)}`;
    position.textContent = `${featuredIndex + 1} of ${featuredGames.length}`;
}

function genreMatches(gameGenres, requestedGenre) {
    const normalize = value => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const genres = (gameGenres || "").split(",").map(normalize);
    if (requestedGenre === "action-rpg") {
        return genres.includes("action-rpg") || (genres.includes("action") && genres.includes("rpg"));
    }
    return genres.includes(requestedGenre);
}

function renderGameCards(container, games) {
    if (!container) return;
    container.replaceChildren();

    if (games.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = "No games are available right now.";
        container.append(emptyMessage);
        return;
    }

    games.forEach(game => {
        const card = document.createElement("article");
        card.className = "game-card";

        if (game.background) {
            const image = document.createElement("img");
            image.src = game.background;
            image.alt = `${game.name} cover`;
            image.loading = "lazy";
            card.append(image);
        }

        const body = document.createElement("div");
        body.className = "game-card-body";
        const title = document.createElement("h4");
        title.textContent = game.name;
        const rating = document.createElement("p");
        rating.className = "rating";
        rating.textContent = `RAWG rating: ${game.rating ?? "N/A"} / 5`;
        const details = document.createElement("a");
        details.className = "btn-details";
        details.href = `game.html?id=${encodeURIComponent(game.id)}`;
        details.textContent = "View Details";

        body.append(title, rating, details);
        card.append(body);
        container.append(card);
    });
}
