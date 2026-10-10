document.addEventListener("DOMContentLoaded", initializeGamePage);

async function initializeGamePage() {
    const gameId = new URLSearchParams(window.location.search).get("id");
    const game = (window.RPG_CATALOG || []).find(item => item.id === gameId);
    const loading = document.getElementById("game-loading");

    if (!gameId) {
        loading.textContent = "Choose a game from the home page to view its details.";
        return;
    }

    if (game) renderGameDetails(game);

    const form = document.getElementById("review-form");
    const reviewStatus = document.getElementById("review-status");
    form.addEventListener("submit", event => submitReview(event, gameId, form, reviewStatus));
    document.getElementById("review-sort").addEventListener("change", () => loadReviews(gameId));
    loadReviews(gameId);

    if (window.RAWG_API_KEY) {
        await loadRawgGame(gameId, game?.name);
    } else if (!game) {
        loading.textContent = "This game could not be found. Return home and choose a game from the catalog.";
        return;
    }

    loading.style.display = "none";
    document.getElementById("game-details-content").style.display = "block";
}

function renderGameDetails(game) {
    document.getElementById("game-title").textContent = game.name;
    document.getElementById("game-rating").textContent = game.rating ?? "N/A";
    document.getElementById("game-released").textContent = game.released || "N/A";
    document.getElementById("game-genres").textContent = game.genres || "RPG";
    document.getElementById("game-description").textContent = game.description || `${game.name} is an RPG adventure.`;

    const banner = document.getElementById("game-banner");
    if (game.background) {
        banner.src = game.background;
        banner.alt = `${game.name} artwork`;
        banner.hidden = false;
    } else {
        banner.hidden = true;
    }

    const steamLink = document.createElement("a");
    steamLink.href = `https://store.steampowered.com/search/?term=${encodeURIComponent(game.name)}`;
    steamLink.target = "_blank";
    steamLink.rel = "noopener noreferrer";
    steamLink.textContent = "Search on Steam";
    document.getElementById("steam-link-container").replaceChildren(steamLink);
    document.getElementById("game-logo").hidden = true;
    document.getElementById("game-wordmark").textContent = game.name;
    document.getElementById("trailer-container").textContent = "Checking the game archive for an embedded trailer...";
}

async function loadRawgGame(gameId, gameName) {
    try {
        let rawgId = gameId;
        if (!/^\d+$/.test(rawgId)) {
            if (!gameName) return;
            const searchUrl = new URL("https://api.rawg.io/api/games");
            searchUrl.searchParams.set("key", window.RAWG_API_KEY);
            searchUrl.searchParams.set("search", gameName);
            searchUrl.searchParams.set("page_size", "1");
            const searchResponse = await fetch(searchUrl);
            if (!searchResponse.ok) throw new Error(`RAWG search failed (${searchResponse.status}).`);
            const searchData = await searchResponse.json();
            rawgId = String(searchData.results?.[0]?.id || "");
            if (!rawgId) {
                showEmbeddedTrailerSearch(gameName || "");
                return;
            }
        }

        const url = new URL(`https://api.rawg.io/api/games/${encodeURIComponent(rawgId)}`);
        url.searchParams.set("key", window.RAWG_API_KEY);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`RAWG game request failed (${response.status}).`);

        const game = await response.json();
        renderGameDetails({
            name: game.name,
            rating: game.rating,
            released: game.released,
            genres: (game.genres || []).map(genre => genre.name).join(", "),
            background: game.background_image,
            description: game.description_raw || game.description?.replace(/<[^>]*>/g, " ") || ""
        });

        const [hasRawgTrailer, steamAppId] = await Promise.all([
            loadRawgTrailer(rawgId),
            loadRawgSteamLink(rawgId)
        ]);
        if (!hasRawgTrailer && steamAppId) await loadSteamTrailer(steamAppId);
        else if (!hasRawgTrailer) {
            document.getElementById("trailer-container").textContent = "No playable trailer is available for this game.";
        }
    } catch (error) {
        console.error("Could not load expanded RAWG game details.", error);
        showEmbeddedTrailerSearch(gameName || document.getElementById("game-title").textContent);
    }
}

async function loadRawgTrailer(gameId) {
    const container = document.getElementById("trailer-container");
    try {
        const url = new URL(`https://api.rawg.io/api/games/${encodeURIComponent(gameId)}/movies`);
        url.searchParams.set("key", window.RAWG_API_KEY);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`RAWG trailer request failed (${response.status}).`);
        const data = await response.json();
        const trailer = data.results?.find(item => item.data?.max || item.data?.["480"]);
        const videoUrl = trailer?.data?.max || trailer?.data?.["480"];
        if (!videoUrl) {
            return false;
        }

        renderTrailer(videoUrl, "video/mp4", trailer.name);
        return true;
    } catch (error) {
        console.error("Could not load a RAWG trailer.", error);
        return false;
    }
}

async function loadRawgSteamLink(gameId) {
    try {
        const url = new URL(`https://api.rawg.io/api/games/${encodeURIComponent(gameId)}/stores`);
        url.searchParams.set("key", window.RAWG_API_KEY);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`RAWG store request failed (${response.status}).`);
        const data = await response.json();
        const steam = data.results?.find(store => store.store_id === 1 && store.url);
        if (!steam) return;

        const steamLink = document.createElement("a");
        steamLink.href = steam.url;
        steamLink.target = "_blank";
        steamLink.rel = "noopener noreferrer";
        steamLink.textContent = "View / Buy on Steam";
        document.getElementById("steam-link-container").replaceChildren(steamLink);

        const appId = steam.url.match(/\/app\/(\d+)/)?.[1];
        if (!appId) return null;
        const logo = document.getElementById("game-logo");
        logo.src = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/logo.png`;
        logo.alt = `${document.getElementById("game-title").textContent} logo`;
        logo.hidden = false;
        logo.addEventListener("error", () => {
            logo.hidden = true;
        }, { once: true });
        return appId;
    } catch (error) {
        console.error("Could not load RAWG store links.", error);
        return null;
    }
}

async function loadSteamTrailer(appId) {
    const container = document.getElementById("trailer-container");
    try {
        const url = new URL("../php/steam-trailer.php", window.location.href);
        url.searchParams.set("app_id", appId);
        const response = await fetch(url, { credentials: "same-origin" });
        const result = await response.json();
        if (!response.ok) {
            container.textContent = result.message || "No playable trailer is available for this game.";
            return;
        }
        renderTrailer(result.stream, "application/vnd.apple.mpegurl", result.name);
    } catch (error) {
        console.error("Could not load a Steam trailer.", error);
        container.textContent = "The trailer could not be loaded.";
    }
}

function renderTrailer(streamUrl, format, title) {
    const video = document.createElement("video");
    video.controls = true;
    video.preload = "metadata";
    video.className = "game-trailer";
    video.setAttribute("aria-label", `${title || document.getElementById("game-title").textContent} trailer`);

    if (format === "video/mp4") {
        const source = document.createElement("source");
        source.src = streamUrl;
        source.type = format;
        video.append(source);
        document.getElementById("trailer-container").replaceChildren(video);
        return;
    }

    if (video.canPlayType(format)) {
        video.src = streamUrl;
        document.getElementById("trailer-container").replaceChildren(video);
        return;
    }

    loadHlsPlayer(video, streamUrl);
}

function loadHlsPlayer(video, streamUrl) {
    const container = document.getElementById("trailer-container");
    const startPlayer = () => {
        if (!window.Hls || !window.Hls.isSupported()) {
            container.textContent = "This browser cannot play the available trailer format.";
            return;
        }

        const player = new window.Hls();
        player.loadSource(streamUrl);
        player.attachMedia(video);
        player.on(window.Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
                player.destroy();
                container.textContent = "The trailer stream could not be played.";
            }
        });
        container.replaceChildren(video);
    };

    if (window.Hls) {
        startPlayer();
        return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js";
    script.onload = startPlayer;
    script.onerror = () => {
        container.textContent = "The trailer player could not be loaded.";
    };
    document.head.append(script);
}

async function loadReviews(gameId) {
    const status = document.getElementById("reviews-status");
    const list = document.getElementById("reviews-list");
    const sort = document.getElementById("review-sort").value;
    status.textContent = "Loading reviews...";

    try {
        const url = new URL("../php/reviews.php", window.location.href);
        url.searchParams.set("game_id", gameId);
        url.searchParams.set("sort", sort);
        const response = await fetch(url, { credentials: "same-origin" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not load reviews.");

        list.replaceChildren();
        if (result.reviews.length === 0) {
            status.textContent = "No reviews yet. Be the first adventurer to leave one.";
            return;
        }

        status.textContent = `${result.reviews.length} ${result.reviews.length === 1 ? "review" : "reviews"}`;
        result.reviews.forEach(review => list.append(renderReview(review, result.logged_in)));
    } catch (error) {
        status.textContent = error.message;
    }
}

function renderReview(review, loggedIn) {
    const card = document.createElement("article");
    card.className = "review-card";

    const header = document.createElement("header");
    const author = document.createElement("h3");
    author.textContent = review.username;
    const time = document.createElement("time");
    time.dateTime = review.created_at.replace(" ", "T");
    const date = new Date(`${review.created_at.replace(" ", "T")}Z`);
    time.textContent = Number.isNaN(date.getTime()) ? review.created_at : date.toLocaleString();
    header.append(author, time);

    const xp = document.createElement("p");
    xp.className = "review-xp";
    xp.textContent = `${review.xp} XP / 5`;
    const comment = document.createElement("p");
    comment.className = "review-comment";
    comment.textContent = review.comment;

    const like = document.createElement("button");
    like.type = "button";
    like.className = "review-like";
    like.setAttribute("aria-pressed", String(review.liked_by_me));
    like.textContent = loggedIn
        ? `${review.liked_by_me ? "Unlike" : "Like"} (${review.like_count})`
        : `Log in to like (${review.like_count})`;
    if (loggedIn) {
        like.addEventListener("click", () => toggleReviewLike(review.id, like));
    } else {
        like.title = "Log in to like reviews.";
        like.addEventListener("click", () => {
            window.location.href = "Login-Page.html";
        });
    }

    card.append(header, xp, comment, like);
    return card;
}

async function toggleReviewLike(reviewId, button) {
    button.disabled = true;
    const formData = new FormData();
    formData.set("review_id", String(reviewId));

    try {
        const response = await fetch("../php/toggle-review-like.php", {
            method: "POST",
            body: formData,
            credentials: "same-origin"
        });
        const result = await response.json();
        if (response.status === 401) {
            window.location.href = "Login-Page.html";
            return;
        }
        if (!response.ok) throw new Error(result.message || "Could not update the like.");

        button.setAttribute("aria-pressed", String(result.liked));
        button.textContent = `${result.liked ? "Unlike" : "Like"} (${result.like_count})`;
        button.disabled = false;
    } catch (error) {
        button.textContent = error.message;
        button.disabled = false;
    }
}

async function submitReview(event, gameId, form, status) {
    event.preventDefault();
    status.textContent = "Submitting review...";

    const formData = new FormData();
    formData.set("game_id", gameId);
    formData.set("rating", document.getElementById("rating-select").value);
    formData.set("comment", document.getElementById("comment-text").value.trim());

    try {
        const response = await fetch("../php/save-review.php", {
            method: "POST",
            body: formData,
            credentials: "same-origin"
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not submit your review.");

        status.textContent = result.message;
        form.reset();
        await loadReviews(gameId);
    } catch (error) {
        status.textContent = error.message;
        if (error.message.includes("log in")) {
            const loginLink = document.createElement("a");
            loginLink.href = "Login-Page.html";
            loginLink.textContent = " Log in";
            status.append(loginLink);
        }
    }
}
