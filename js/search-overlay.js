const searchDialog = document.getElementById("search-dialog");
const searchInput = document.getElementById("game-search");

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
