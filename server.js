import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public2")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public2", "data-project1.html"));
});

const invertedIndex = new Map();
const urlList = [];
let pageRanks = [];

try {
  const pageRankFilePath = path.join(__dirname, "data", "index_to_rank.json");
  const pageRankContent = fs.readFileSync(pageRankFilePath, "utf8");
  
  pageRanks = pageRankContent
    .replace(/\s+/g, '')
    .split(',')
    .map(item => parseInt(item.trim(), 10) || 0);
  
  console.log(`Loaded ${pageRanks.length} page rankings`);
} catch (error) {
  console.error("Error loading page ranks:", error);
  pageRanks = [];
}

const urlsFilePath = path.join(__dirname, "data", "urls");

try {
  const urlsFileContent = fs.readFileSync(urlsFilePath, "utf8");
  const urlLines = urlsFileContent
    .split("\n")
    .filter(
      (line) => line.trim() && !line.startsWith(";") && !line.startsWith("//")
    );

  urlLines.forEach((line) => {
    urlList.push(line.trim());
  });
} catch (error) {
  console.error("Error loading URL list:", error);
  process.exit(1);
}

try {
  const indexFilePath = path.join(__dirname, "data", "sorted");
  const indexContent = fs.readFileSync(indexFilePath, "utf8");
  const lines = indexContent
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("//"));

  lines.forEach((line) => {
    const parts = line.split("\t");
    if (parts.length === 2) {
      const word = parts[0].trim();
      const pairsText = parts[1].trim();

      const pairs = pairsText.split(";").filter((pair) => pair.trim());

      const results = [];
      pairs.forEach((pairString) => {
        const pair = pairString.trim().split(":");

        if (pair.length === 2) {
          const fileIndex = parseInt(pair[0].trim(), 10) - 1;
          const frequency = parseInt(pair[1].trim(), 10);

          if (fileIndex >= 0 && fileIndex < urlList.length) {
            results.push({
              fileIndex: fileIndex,
              frequency: frequency,
            });
          }
        }
      });
      invertedIndex.set(word, results);
    }
  });
} catch (error) {
  console.error("Error loading inverted index:", error);
  process.exit(1);
}

function performSearch(searchQuery, page = 1, perPage = 100, res, rankingType = "frequency") {
  try {
    if (!searchQuery) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const searchWords = searchQuery
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.trim().length > 0);

    if (searchWords.length === 0) {
      return res.status(400).json({ error: "No valid search words provided" });
    }
    
    const wordResults = {};
    
    const startTime = process.hrtime();

    // Process each search word - OPTIMIZED VERSION
    for (const searchWord of searchWords) {
      const results = invertedIndex.get(searchWord);

      if (!results) {
        // Skip words that are not found
        console.log(`Word not found: ${searchWord}`);
        continue;
      }

      wordResults[searchWord] = results;
    }

    // Check if any words were found
    if (Object.keys(wordResults).length === 0) {
      return res
        .status(404)
        .json({ error: "None of the search words were found" });
    }

    // Find common URLs across all found words - OPTIMIZED WITH SET OPERATIONS
    let allResults = [];
    
    // Sort words by frequency (ascending) to start with the least common word for better performance
    const sortedWords = Object.keys(wordResults).sort((a, b) => 
      wordResults[a].length - wordResults[b].length
    );
    
    // Get file indices for the least common word
    const firstWordResults = wordResults[sortedWords[0]];
    const commonFileIndices = new Set(firstWordResults.map(item => item.fileIndex));
    
    // Filter by other words
    for (let i = 1; i < sortedWords.length; i++) {
      const word = sortedWords[i];
      const currentWordIndices = new Set(wordResults[word].map(item => item.fileIndex));
      
      // Keep only indices present in both sets
      for (const idx of commonFileIndices) {
        if (!currentWordIndices.has(idx)) {
          commonFileIndices.delete(idx);
        }
      }
      
      // Early exit if no common URLs
      if (commonFileIndices.size === 0) {
        break;
      }
    }

    // Combine results for URLs that contain all search words
    if (commonFileIndices.size > 0) {
      // Use a map for O(1) lookup instead of nested loops
      const fileIndexMap = new Map();
      
      // Pre-process all word results for quick lookups
      for (const word in wordResults) {
        for (const result of wordResults[word]) {
          if (!fileIndexMap.has(result.fileIndex)) {
            fileIndexMap.set(result.fileIndex, new Map());
          }
          fileIndexMap.get(result.fileIndex).set(word, result.frequency);
        }
      }
      
      // Build final results from common indices
      allResults = Array.from(commonFileIndices).map(fileIndex => {
        const wordFreqMap = fileIndexMap.get(fileIndex);
        let totalFrequency = 0;
        
        // Sum frequencies for each word
        for (const freq of wordFreqMap.values()) {
          totalFrequency += freq;
        }

        const url = urlList[fileIndex];
        const pageRank = pageRanks[fileIndex] || 0; // Get page rank or default to 0
        return {
          url: url + `#:~:text=${searchWords.join(",")}`,
          frequency: totalFrequency,
          pageRank: pageRank,
        };
      });
      
      // Sort results based on rankingType
      if (rankingType === "frequency") {
        allResults.sort((a, b) => b.frequency - a.frequency);
      } else if (rankingType === "alphabetical") {
        allResults.sort((a, b) => a.url.localeCompare(b.url));
      } else if (rankingType === "pageRank") {
        allResults.sort((a, b) => a.pageRank - b.pageRank);
      }
    }

    // Calculate pagination data
    const totalResults = allResults.length;
    const totalPages = Math.ceil(totalResults / perPage);
    const currentPage = Math.min(Math.max(1, page), totalPages || 1);
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;

    // Get paginated results
    const paginatedResults = allResults.slice(startIndex, endIndex);
    
    // Calculate performance metrics
    const endTime = process.hrtime(startTime);
    const executionTimeMs = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2);
    console.log(`Search for "${searchQuery}" completed in ${executionTimeMs}ms, found ${totalResults} results`);

    // Send response
    res.json({
      query: searchQuery,
      results: paginatedResults,
      pagination: {
        currentPage,
        totalPages,
        totalResults,
        perPage,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      },
      performance: {
        executionTimeMs: parseFloat(executionTimeMs)
      }
    });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Only using GET method for search endpoint
app.get("/api/search", (req, res) => {
  const searchQuery = req.query.word;
  const page = parseInt(req.query.page) || 1;
  const perPage = parseInt(req.query.perPage) || 20;
  const rankingType = req.query.rankingType || "frequency"; // Add rankingType parameter with default "frequency"
  performSearch(searchQuery, page, perPage, res, rankingType);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
