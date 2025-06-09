with open("part-r-00000", "r") as f:
    list = f.read().split("\n")
sorted_file=open("inverted_index", "w")
inv={}
for i in list:
    word, count = i.split('\t',1)
    count = count.split(';')
    count =[i.split(':') for i in count]
    count = [ [int(i[0]), int(i[1])] for i in count if len(i)==2 and i[0] != [''] and i[1] != ['']]
    count = sorted(count, key=lambda x: x[1], reverse=True)
    line=""
    for i in count:
        line += str(i[0]) + ":" + str(i[1]) + ";"
    sorted_file.write(word + "\t"+ line+"\n")
sorted_file.close()