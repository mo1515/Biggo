import re
import time
import multiprocessing as mp
import pickle

def get_links(r)->list: 
    try:
        links = re.findall( r'<a\s[^>]*href=["\'](http[^"\']+\.(?!jpg|jpeg|png|gif|bmp|svg)[^"\']*)["\']',r, re.IGNORECASE)
        return list(set(links))
    except :
        print(f"Error getting links from {r}")
        return []


def finder(lock,page_no,graph)->None:
    runnning=True
    index={}
    temp_graph={}

    def read_indecies():
        start=0
        with open('map/urls') as f:
            while start<100572:
                url=f.readline()
                url=url.replace('\n','')
                index[url]=start
                start+=1
    
    read_indecies()
    start=0
    while runnning:
        with lock :
            start=page_no.value
            page_no.value+=100
        print(start)
        for i in range(100):
            if(start>100571):
                return
            soup=open('html/'+str(start)+'.html','r',encoding='utf8').read()
            links=get_links(soup)
            links=[i.replace('\n','') for i in links]
            # Filter out links that don't exist in the index
            valid_links = [index[i] for i in links if i in index]
            temp_graph[start]=valid_links
            start+=1
        with lock:
            for i in temp_graph:
                if i not in graph:
                    graph[i]=int(temp_graph[i])
                else:
                    graph[i].extend(temp_graph[i])
            temp_graph.clear()




def build_graph(lock,no_processes,page_no,graph):
    processes=[]
    for i in range(no_processes):
        p = mp.Process(target=finder,args=(lock,page_no,graph))
        processes.append(p) 
        p.start()
    for p in processes:p.join()



if __name__ == '__main__':
    manager = mp.Manager()
    page_no= manager.Value('i',0)
    no_processes = 32
    lock = manager.Lock()
    graph = manager.dict()
    build_graph(lock,no_processes,page_no,graph)

    new_graph = {}
    for i in graph:
        new_graph[i] = graph[i]
    pickle.dump(new_graph, open('map/graph.pkl', 'wb'))
