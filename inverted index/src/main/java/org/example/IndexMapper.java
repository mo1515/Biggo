package org.example;

import org.apache.hadoop.io.*;
import org.apache.hadoop.mapreduce.Mapper;
import org.apache.hadoop.mapreduce.lib.input.FileSplit;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.StringTokenizer;

public class IndexMapper extends Mapper<LongWritable, Text, Text, Text> {
    @Override
    protected void map(LongWritable key, Text value,
                       Context context) throws IOException, InterruptedException {
        Map<String,Integer> freq = new HashMap<>();

        FileSplit split = (FileSplit) context.getInputSplit();
        StringTokenizer tokenizer = new StringTokenizer(value.toString());

        String fileName = split.getPath().getName().split("\\.")[0];
        Text file=new Text(),word=new Text();

        while (tokenizer.hasMoreTokens()) {
            String txt=tokenizer.nextToken();
            if(txt.isEmpty()) {
                continue;
            }
            freq.put(txt, freq.getOrDefault(txt, 0) + 1);
        }
        for (HashMap.Entry<String, Integer> entry : freq.entrySet()) {
            word.set(entry.getKey());
            file.set(fileName+":"+entry.getValue().toString()+';');
            context.write(word, file);
        }
    }
}