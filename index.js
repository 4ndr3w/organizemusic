#!/usr/bin/env node
var metadata = require("musicmetadata"),
    async = require("async");
    fs = require("fs"),
    path = require("path");

var concurrent = 100;

if ( process.argv.length == 4 )
{
  var source_dir = process.argv[2];
  var dst_dir = process.argv[3];
}
else
{
  console.log("Usage: musicorganizer SOURCE_DIR DST_DIR");
  process.exit(0);
}

var files = new Array();
function buildFS(p)
{
  var dir = fs.readdirSync(p);
  for ( d in dir )
  {
    var file = path.join(p,dir[d]);
    var stats = fs.statSync(file);
    if ( stats.isDirectory() )
      buildFS(file);
    else
      files.push(file);
  }
}
buildFS(source_dir);

async.eachLimit(
  files,
  concurrent,
  function(src, cb)
  {
    var parser = metadata(fs.createReadStream(src), {duration:false});
    var filetype = path.extname(src);
    parser.on("metadata", function(data)
    {
      if ( data.artist.length != 0 && data.title && data.album  )
      {
        console.log(data);
        var artist_dir = path.join(dst_dir, data.artist.join(""));
        var dst = path.join(artist_dir, data.album+"("+data.year+")");
        dst = path.join(dst, data.title);

        try
        {
          fs.mkdirSync(artist_dir);
          fs.mkdirSync(path.join(artist_dir, data.album+"("+data.year+")"));
        } catch (e) {  }
        console.log("Processed "+src);
        fs.rename(src, dst);
      }
      cb();
    });

    parser.on("done", function(err)
    {
      if ( err )
      {
        cb();
      }
    });
  },
  function(err)
  {
    console.log("Done! Processed "+files.length+" files.");
  }
);
