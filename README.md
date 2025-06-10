# Biggo
is a lightweight search engine designed to crawl, index, and rank web pages.
It has been tested on a collection of over 100,000 web pages.

Web Crawling & Ranking: Implemented in Python, responsible for collecting and preprocessing pages, constructing the link graph, and computing PageRank.

Indexing: An inverted index is constructed using MapReduce (Java).

Backend: The search backend is built with Node.js and ExspressJS, providing fast and responsive query processing and result retrieval.

Frontend: A simple, user-friendly web interface built with HTML, CSS, Bootstrap and JavaScript to allow users to search and view ranked results efficiently with multiple views.


Note: the crawling process uses fasttext for language detection.
fasttext models: https://fasttext.cc/docs/en/language-identification.html
