import requests
import re
import time
from bs4 import BeautifulSoup
import multiprocessing as mp
import fasttext
from queue import Queue
from random import sample , random
links = ['https://en.wikipedia.org/wiki/Main_Page'  , 'https://www.reddit.com/','https://www.linkedin.com/' , 'https://www.github.com/','https://www.stackoverflow.com/','https://www.nytimes.com/international/','https://web.archive.org/','https://cnn.com/','https://www.amazon.com/','https://www.ebay.com/','https://www.freecodecamp.org/','https://www.w3schools.com/','https://www.google.com/','https://www.youtube.com/','https://moz.com/top500','https://stackoverflow.com/questions','https://www.reddit.com/explore/','https://www.geeksforgeeks.org/','https://www.bbc.com/','https://www.nature.com/','https://www.scientificamerican.com/','https://www.vox.com/','https://www.goodreads.com/','https://www.imdb.com/','https://www.history.com/','https://www.theguardian.com/international']

MODEL_PATH = 'lid.176.bin'

def is_eng(soup:BeautifulSoup,model:fasttext.FastText._FastText)->bool:
    text = soup.get_text()
    text.split()
    text = ' '.join(text[:min(len(text),100)].split())
    return model.predict(text)[0][0]  == '__label__en'







def save_cleaned(filename, soup:BeautifulSoup):
    [s.extract() for s in soup(['style', 'script', 'head', 'title', 'meta', 'noscript', 'iframe', 'footer', 'header', 'nav', 'form'])]
    words = soup.get_text(separator=' ').lower()
    with open('text4/'+filename, 'w', encoding='utf-8') as f:
        words = re.sub(r'[^a-z\s]', ' ', words)
        words = re.sub(r'(\s|\n)+', ' ', words)
        f.write(words)
        
def save_html(filename, soup:BeautifulSoup)->None:
    with open('html/'+filename, 'w', encoding='utf-8') as f:f.write(soup.prettify())
    

def save(page_no:int,soup)->None:
    save_html(f'{page_no}.html', soup)
    save_cleaned(str(page_no), soup)

    
def get_links(r)->list: 
    try:
        links = re.findall( r'<a\s[^>]*href=["\'](http[^"\']+\.(?!jpg|jpeg|png|gif|bmp|svg)[^"\']*)["\']',r, re.IGNORECASE)
        return list(set(links))
    except :
        print(f"Error getting links from {r}")
        return []


def crawler(lock,queued,to_visit,page_no,end)->None:
    seed=Queue()
    eng_pages=Queue()
    pages=Queue()
    model = fasttext.load_model(MODEL_PATH)
    links = []
    run = True
    
    def save_batch():
        with lock:
            print(f"Saving...")
            first=page_no.value
            with open(f'map/urls', 'a', encoding='utf-8') as f:
                while not eng_pages.empty():
                    url,page = eng_pages.get()
                    f.write(f'{first},{url}\n')
                    first+=1
                    pages.put(page)
                first,page_no.value = page_no.value,first
        while not pages.empty():
            page = pages.get()
            save(first,page)
            first+=1


    while run:
        with lock:
            if not to_visit.empty():
                size=to_visit.qsize()
                to_fetch=25
                if size<800:
                    to_fetch = max((size//32),1)
                    
                for i in range(to_fetch):
                    seed.put(to_visit.get())

        links = []
        if seed.empty() and run:
            time.sleep(0.1)
        while not seed.empty():
            current_url = seed.get()
            try:
                r = requests.get(current_url,timeout=3)
                soup =BeautifulSoup(r.text, 'html.parser')
                if r.status_code == 200 and is_eng(soup,model):
                    eng_pages.put((current_url,soup))
                    if eng_pages.qsize() > 50:
                        save_batch()
                    next=get_links(r.text)
                    
                    # limit the number of links to fetched from each page for example geeksforgeeks has a lot of links
                    # lim=2 if 'geeksforgeeks' in current_url else 5
                    # links = links+sample(next , min(lim,len(next)))

                    links = links + next
                    with lock:
                        if end.value:
                            run=False
                            break
            except Exception as e:
                print(f"Error fetching {current_url}: {e}")

        
        links = list(set(links))
        with lock:
            for link in links:
                if link not in queued:
                    queued[link] = 1
                    try: 
                        if to_visit.qsize() < 5000:
                            to_visit.put(link)
                        else:
                            if random() > 0.7:
                                to_visit.get()
                                to_visit.put(link)
                    except:
                        break
    save_batch()





def track(lock, queued, to_visit,page_no,end) -> None:
    run = True
    while run:
        with lock:
            cnt =len(queued)-to_visit.qsize()  # Calculate the difference correctly
            yet_to_visit=to_visit.qsize()
            saved=page_no.value
        print(f"Pages visited so far: {cnt} still have {yet_to_visit} , saved: {saved}")
        if saved>100000:
            with lock:
                run=False
                end.value=True
            print(f"stoping , finalizing with {saved} files saved")
        time.sleep(1)



def crawl(seed,queued,lock,to_visit,no_processes,page_no,end):
    start_time = time.time()
    for link in seed: to_visit.put(link)
    processes=[]
    # savers=[]
    for i in range(no_processes):
        p = mp.Process(target=crawler,args=(lock,queued,to_visit,page_no,end))
        processes.append(p) 
        p.start()
    
    tracker=mp.Process(target=track,args=(lock,queued,to_visit,page_no,end))
    tracker.start()


    for p in processes:p.join()
    tracker.join()


    with open('all_links.txt', 'w', encoding='utf8') as f:
        for link in queued.keys():
            f.write(link + '\n')





if __name__ == '__main__':
    with open('map/urls', 'w', encoding='utf8') as f:
        pass
    manager = mp.Manager()
    queued = manager.dict()
    to_visit = manager.Queue(5000)
    page_no= manager.Value('i',0)
    end=manager.Value('b',False)
    no_processes = 32
    for i in links:
        queued[i] = 1
    lock = manager.Lock()
    crawl(links,queued,lock,to_visit,no_processes,page_no,end)
