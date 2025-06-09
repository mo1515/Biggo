import pickle
import json

graph = pickle.load(open("map/graph.pkl", "rb"))
dmp_factor = 0.85
scores = [1/100572 for i in range(100572)]

for it in range(100):
    for i in graph:
        if len(graph[i]):
            local_sm = 0
            for j in graph[i]:
                local_sm += scores[j]
            local_sm = local_sm/len(graph[i])
        scores[i] = (1-dmp_factor)/100572 + local_sm*dmp_factor
    if it%10 == 0:
        print(f"Iteration {it}")


ranked_pages = list(enumerate(scores))
ranked_pages.sort(key=lambda x: x[1], reverse=True)

rankings =[(idx, score) for idx, score in ranked_pages]



index_to_rank = [0] * len(rankings)

rank=0
for i in rankings:
    index_to_rank[i[0]] = rank
    rank += 1
json.dump(index_to_rank, open("index_to_rank.json", "w"))




print("\nTop 10 pages by PageRank:")


for rank, (page_idx, score) in enumerate(ranked_pages[:10], 1):
    print(f"Rank {rank}: Page {page_idx} (Score: {score})")