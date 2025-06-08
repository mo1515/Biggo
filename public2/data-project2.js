document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("search-button");
  const statusContainer = document.getElementById("statusContainer");
  const resultsContainer = document.getElementById("resultsContainer");
  const rankingDropdown = document.getElementById("rankingDropdown");
  const paginationContainer = document.createElement("div");
  paginationContainer.id = "paginationContainer";

  let currentQuery = "";
  let currentPage = 1;
  let currentRankingType = "frequency";
  const perPage = 20;

  const searchCache = new Map();

  rankingDropdown.querySelectorAll(".dropdown-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      currentRankingType = e.target.getAttribute("data-value");

      rankingDropdown.querySelectorAll(".dropdown-item").forEach((dropItem) => {
        dropItem.classList.remove("active");
      });
      e.target.classList.add("active");

      const dropdownButton = document.querySelector(
        ".ranking-dropdown-container .dropdown-toggle"
      );

      if (currentRankingType === "frequency") {
        dropdownButton.innerHTML = `Frequency Ranking`;
      } else if (currentRankingType === "pageRank") {
        dropdownButton.innerHTML = `Page Rank`;
      } else if (currentRankingType === "alphabetical") {
        dropdownButton.innerHTML = `Alphabetical`;
      }

      if (currentQuery) {
        performSearch(currentQuery, 1);
      }
    });
  });

  // Function to handle search
  async function performSearch(query, page = 1) {
    if (!query) return;

    currentQuery = query;
    currentPage = page;

    searchInput.value = query;

    // making the cache key
    const cacheKey = `${query}_page${page}_perPage${perPage}_ranking${currentRankingType}`;

    resultsContainer.innerHTML = "";
    paginationContainer.innerHTML = "";

    if (searchCache.has(cacheKey)) {
      const cachedData = searchCache.get(cacheKey);
      displayResults(cachedData);
      return;
    }

    try {
      const searchUrl = `/api/search?word=${encodeURIComponent(
        query
      )}&page=${page}&perPage=${perPage}&rankingType=${currentRankingType}`;

      const response = await fetch(searchUrl);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to search for the words");
      }

      searchCache.set(cacheKey, data);

      displayResults(data);
    } catch (error) {
      if (error.name === "AbortError") {
        statusContainer.innerHTML = `<div class="error">Request timed out. Please try again.</div>`;
      } else {
        statusContainer.innerHTML = `<div class="error">${error.message}</div>`;
      }
    }
  }

  function displayResults(data) {
    if (data.pagination) {
      statusContainer.innerHTML = `<div class="loading"><h4>${data.pagination.totalResults} links found</h4></div>`;
    } else {
      statusContainer.innerHTML = `<div class="loading">${
        data.results?.length || 0
      } links found</div>`;
    }

    if (data.results && data.results.length > 0) {
      let resultsHtml = ``;

      data.results.forEach((result) => {
        let badgeHtml = "";
        if (currentRankingType === "frequency") {
          badgeHtml = `<span class="freq-badge">Total Frequency: ${result.frequency}</span>`;
        } else if (currentRankingType === "pageRank") {
          badgeHtml = `<span class="freq-badge" style="background-color:rgba(66, 148, 110, 0.66);">Page Rank: ${result.pageRank}</span>`;
        } else if (currentRankingType === "alphabetical") {
          badgeHtml = "";
        }
        resultsHtml += `
                    <div class="result-item">
                        ${badgeHtml}
                        <a href="${result.url}" target="_blank">${result.url}</a>
                    </div>
                `;
      });

      resultsContainer.innerHTML = resultsHtml;

      if (data.pagination && data.pagination.totalPages > 1) {
        renderPagination(data.pagination);

        if (!document.body.contains(paginationContainer)) {
          resultsContainer.after(paginationContainer);
        }
      }
    } else {
      resultsContainer.innerHTML = `<div class="search-info">No results found for "${data.query}"</div>`;
    }
  }

  function renderPagination(pagination) {
    const { currentPage, totalPages, hasNextPage, hasPrevPage } = pagination;

    let paginationHtml = '<div class="pagination-controls">';

    paginationHtml += `<button class="pagination-btn ${
      !hasPrevPage ? "disabled" : ""}"
      data-page="${
        currentPage - 1
      }"><i class="fas fa-chevron-left"></i> Previous</button>`;

    paginationHtml += '<div class="pagination-pages">';

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (endPage - startPage < 4) {
      if (startPage === 1) {
        endPage = Math.min(totalPages, startPage + 4);
      } else if (endPage === totalPages) {
        startPage = Math.max(1, endPage - 4);
      }
    }

    // First page
    if (startPage > 1) {
      paginationHtml += `<button class="pagination-num-btn" data-page="1">1</button>`;
      if (startPage > 2)
        paginationHtml += '<span class="pagination-ellipsis">...</span>';
    }

    // make page buttons with numbers
    for (let i = startPage; i <= endPage; i++) {
      paginationHtml += `<button class="pagination-num-btn ${
        i === currentPage ? "active" : ""
      }" 
                               data-page="${i}">${i}</button>`;
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1)
        paginationHtml += '<span class="pagination-ellipsis">...</span>';
      paginationHtml += `<button class="pagination-num-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    paginationHtml += "</div>";

    // Next button
    paginationHtml += `<button class="pagination-btn ${
      !hasNextPage ? "disabled" : ""
    }" 
                            ${!hasNextPage ? "disabled" : ""} 
                            data-page="${currentPage + 1}">
                            Next <i class="fas fa-chevron-right"></i>
                          </button>`;

    paginationHtml += "</div>";

    // Add page info
    paginationHtml += `<div class="pagination-info">
                            Page ${currentPage} of ${totalPages} 
                            (${pagination.totalResults} total results)
                          </div>`;

    paginationContainer.innerHTML = paginationHtml;

    // pagination controls event listeners
    const pageButtons =
      paginationContainer.querySelectorAll("button[data-page]");
    pageButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (!button.disabled) {
          const page = parseInt(button.getAttribute("data-page"));
          performSearch(currentQuery, page);
          window.scrollTo(0, statusContainer.offsetTop - 120);
        }
      });
    });
  }

  // Get ranking method from sessionStorage if available
  const savedRankingMethod = sessionStorage.getItem("rankingMethod");
  if (savedRankingMethod) {
    currentRankingType = savedRankingMethod;
    console.log("Using saved ranking method:", currentRankingType);

    // Update dropdown visual state
    rankingDropdown.querySelectorAll(".dropdown-item").forEach((item) => {
      if (item.getAttribute("data-value") === currentRankingType) {
        item.classList.add("active");
      }
    });

    // Update the dropdown button text
    const dropdownButton = document.querySelector(
      ".ranking-dropdown-container .dropdown-toggle"
    );

    if (currentRankingType === "frequency") {
      dropdownButton.innerHTML = `Frequency Ranking`;
    } else if (currentRankingType === "pageRank") {
      dropdownButton.innerHTML = `Page Rank`;
    } else if (currentRankingType === "alphabetical") {
      dropdownButton.innerHTML = `Alphabetical`;
    }

    // Clear after use
    sessionStorage.removeItem("rankingMethod");
  }

  // Get search term from sessionStorage
  const searchQuery = sessionStorage.getItem("searchQuery");
  if (searchQuery) {
    performSearch(searchQuery, 1);
    // Clear after use
    sessionStorage.removeItem("searchQuery");
  }

  // Add click event listener to search button for new searches
  searchButton.addEventListener("click", () => {
    const query = searchInput.value.trim();
    if (query) {
      performSearch(query, 1); // Start at page 1 for new searches
    }
  });

  // Add event listener for Enter key
  searchInput.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      const query = searchInput.value.trim();
      if (query) {
        performSearch(query, 1); // Start at page 1 for new searches
      }
    }
  });

  setInterval(() => {
    if (searchCache.size > 50) {
      searchCache.clear(); // Clear the entire cache
    }
  }, 300000); 
});
