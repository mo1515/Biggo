package org.example;

import org.apache.hadoop.fs.FileSystem;
import org.apache.hadoop.mapreduce.Job;
import org.apache.hadoop.mapreduce.lib.input.FileInputFormat;
import org.apache.hadoop.mapreduce.lib.output.FileOutputFormat;
import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.Path;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.io.MapWritable;
import org.apache.hadoop.io.SortedMapWritable;

public class IndexDriver {

    public static void main(String[] args) throws Exception {
        if (args.length != 2) {
            System.err.println("Usage IndexDriver <input_dir> <output_dir>");
            System.exit(2);
        }



        Configuration conf = new Configuration();
        //    conf.addResource(new Path("/media/mo15/New volume/UNI/3rd yr/Big data/inverted index/core-site.xml"));
        //    conf.addResource(new Path("/media/mo15/New volume/UNI/3rd yr/Big data/inverted index/hdfs-site.xml"));

        String input = args[0];
        String output = args[1];
        FileSystem fs = FileSystem.getLocal(conf);
        Path outputPath = new Path(output);

        if (fs.exists(outputPath)) {
            fs.delete(outputPath, true);
        }

        Job job = Job.getInstance(conf, "Inverted Index Job");
        job.setJarByClass(IndexDriver.class);

        job.setMapperClass(IndexMapper.class);
        job.setReducerClass(IndexReducer.class);

        job.setMapOutputKeyClass(Text.class);
        job.setMapOutputValueClass(Text.class);

        job.setOutputKeyClass(Text.class);
        job.setOutputValueClass(Text.class);

        FileInputFormat.addInputPath(job, new Path(input));
        FileOutputFormat.setOutputPath(job, outputPath);

        System.exit(job.waitForCompletion(true) ? 0 : 1);
    }
}
