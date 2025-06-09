# Biggo
is a lightweight search engine designed to crawl, index, and rank web pages.
It has been tested on a collection of over 100,000 web pages.

Web Crawling & Ranking: Implemented in Python, responsible for collecting and preprocessing pages, constructing the link graph, and computing PageRank.
Indexing: An inverted index is constructed using MapReduce (Java).
Backend: The search backend is built with Node.js, providing fast and responsive query processing and result retrieval.
