const searchDialog = document.getElementById("search-dialog");
const searchInput = document.getElementById("game-search");
const searchForm = searchInput.form;

// Keep the submitted search visible when the catalog page reloads with its query.
searchInput.value = new URLSearchParams(window.location.search).get("q") || "";

searchForm.addEventListener("submit", () => {
    const params = new URLSearchParams(window.location.search);
    const genre = params.get("genre");
    if (!genre) return;

    // Keep category links in effect when a search is submitted from a category page.
    const hiddenInput = document.createElement("input");
    hiddenInput.type = "hidden";
    hiddenInput.name = "genre";
    hiddenInput.value = genre;
    searchForm.append(hiddenInput);
});

document.getElementById("open-search").addEventListener("click", () => {
    searchDialog.showModal();
    searchInput.focus();
});

document.getElementById("close-search").addEventListener("click", () => {
    searchDialog.close();
});

searchDialog.addEventListener("click", event => {
    if (event.target === searchDialog) searchDialog.close();
});
