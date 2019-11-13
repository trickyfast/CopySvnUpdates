const exec = require('child_process').exec;
const execSync = require('child_process').execSync;
const commander = require('commander');
const fs = require('fs');

var repoPath = "";
var revisionNumber = 0;
var outputPath = "";

// To remove spaces and letters before path on svn diff summary output line
var prefixFilter = /^\s?.\s+/gm;

var files = [];
var removed = [];

function Pair(src, dest)
{
  this.src = src;
  this.dest = dest;
}

commander
  .option('-p --path <string>', "Path to SVN repo")
  .option('-r --revision <number>', "Revision number", 0)
  .requiredOption('-o --output <string>', "Output path. Files will be copied here.")
  .option("-f --force", "Force overwrite output path, if it exists.");

commander.parse(process.argv);

if (commander.args.length)
{
  console.warn("Couldn't parse: " + commander.args);
}

revisionNumber = parseInt(commander.revision);
if (isNaN(revisionNumber))
{
  console.error("--revision option must be a number.");
  return 1;
}

outputPath = commander.output;

if (!commander.force && fs.existsSync(outputPath))
{
  console.warn("Output path exists. Use --force to force overwrite.");
  return 2;
}
if (outputPath[outputPath.length-1] !== "/") outputPath += "/";

repoPath = commander.path;
if (!repoPath) repoPath = process.cwd;

try {
  fs.mkdirSync(outputPath);
} 
catch (e)
{
  if (e.code !== "EEXIST")
  {
    console.error("Error: " + e.message);
    return 5;
  }
}

console.log("Querying SVN...");

exec("svn diff --summarize -r" + revisionNumber, {cwd: repoPath}, (error, stdout, stderr) => {
  if (error)
  {
    console.error("Error:" + error);
    return 3;
  }
  if (stderr)
  {
    console.error("stderr: " + error);
    return 4;
  }

  var changes = stdout.split('\n');

  for (let i in changes)
  {
    let change = changes[i];
    //console.log(change);
    change = change.replace(prefixFilter, "");
    if (change === "." || change === "") continue;

    let fullPathChange = repoPath + "/" + change;
    try {
      let stats = fs.lstatSync(fullPathChange); 
      if (stats.isFile) {
        files.push(new Pair(fullPathChange, change));
      }
    }
    catch (lstatErr)
    {
      if (lstatErr.code === "ENOENT") { // File doesn't exist, tested on Mac only
        removed.push(change);
      }
      else {
        console.warn("Couldn't get info: " + lstatErr.path + "\t" + lstatErr.message);
      }
    }
  }

  console.log("Changed files: " + files.length + ". Copying...");

  // Sort from shortest to longest path, because parent paths must be mkdir'd first
  files.sort(pairSort);

  files.forEach((pair) => {
    // Make all parent dirs if they don't exist
    let dirs = pair.dest.split("/");
    let curPath = outputPath;
    for (let i = 0; i < dirs.length - 1; ++i)
    {
      curPath += dirs[i];
      try {
        fs.mkdirSync(curPath);
      }
      catch(e) {
        if (e.code !== "EEXIST")
        {
          console.error("Error making dir: " + e.message);
        }
      }
      curPath += "/";
    }

    // Copy from source to destination
    let src = pair.src;
    let dest = outputPath + pair.dest;
    try {
      if (!fs.existsSync(dest)) {
        fs.copyFile(src, dest, (error) => {
          if (error) {
            console.error(error);
          }
        });
      }
      else {
        fs.unlink(dest, (ulError) => {
          if (error) 
          {
            console.error(ulError);
          }
          else {
            fs.copyFile(src, dest, (cpError) => {
              if (cpError) {
                console.error(cpError);
              }
            });
          }
        });
      }
    }
    catch (exError) {
      console.error(exError);
    }
  });

  if (removed.length > 0)
  {
    console.log("The following files and directories were removed in the working copy since revision " + revisionNumber + ": \n================");
    removed.forEach((gone) => {console.log(gone);});
  }
});

function pairSort(left, right)
{
  return left.dest.length - right.dest.length;
}

function pathSort(left, right)
{
  return left.length - right.length;
}
