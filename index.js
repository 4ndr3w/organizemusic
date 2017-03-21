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
  if (fs.lstatSync(p).isDirectory()) {
    var dir = fs.readdirSync(p);
    for ( var d in dir )
    {
      var file = path.join(p,dir[d]);
      var stats = fs.statSync(file);
      if ( stats.isDirectory() )
        buildFS(file);
      else
        files.push(file);
    }
  } else {
    files.push(p);
  }
}
buildFS(source_dir);

async.eachLimit(
  files,
  concurrent,
  function(src, cb)
  {
    var extension = path.extname(src);
    var parser = metadata(fs.createReadStream(src), {duration:false});
    var filetype = path.extname(src);
    parser.on("metadata", function(data)
    {
      if ( data.artist.length !== 0 && data.title && data.album  )
      {
        console.log(data);
        var artist_dir = path.join(dst_dir, data.artist.join(""));
        var albumDirName = data.album;
        if (data.year) {
          albumDirName += ' (' + data.year +')';
        }
        var albumDirPath = path.join(artist_dir, albumDirName);
        var dst = path.join(artist_dir, albumDirName);

        var fileName = data.title.replace(/[\/\?<>\\:\*\|":]/g,'-') + (extension ? extension : '');
        dst = path.join(dst, fileName);

        try {
          if (!fs.existsSync(artist_dir)) {
            fs.mkdirSync(artist_dir);
          }
          if (fs.existsSync(artist_dir) && !fs.existsSync(albumDirPath)) {
            fs.mkdirSync(albumDirPath);
          }
        } catch (e) { throw(e); }
        console.log("Processed "+src, '~>', dst);
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
