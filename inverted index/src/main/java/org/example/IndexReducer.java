package org.example;

import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.Reducer;
import java.io.IOException;
public class IndexReducer extends Reducer<Text, Text, Text, Text> {

    protected void reduce(Text key, Iterable<Text> values,
                          Context context) throws IOException, InterruptedException {
        StringBuilder inverted_index=new StringBuilder("");
        for(Text text : values){
            inverted_index.append(text.toString());
        }
        Text result=new Text(inverted_index.toString());
        context.write(key , result);
    }
}