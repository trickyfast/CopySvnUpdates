const exec = require('child_process').exec;
const execSync = require('child_process').execSync;
const commander = require('commander');
const fs = require('fs');

var repoPath = "";
var revisionNumber = 0;
var outputPath = "";

// To remove spaces and letters before path on svn diff summary output line
var prefixFilter = /^\s?.\s+/gm;

var dirs = [];
var files = [];

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

if (fs.existsSync(outputPath))
{
  execSync("rm -rf " + outputPath, (error) => {console.error(error);});
}
fs.mkdirSync(outputPath);

var tests = [" M      CAT/Assets/TrickyFastAddons/CATRPGBuilder/NPCs", "A       CAT/Assets/TrickyFastAddons/CATRPGBuilder/Combat/Triggers/OnCriticalDamage.cs"];

// fs.copyFile("/Users/joseph/meh.txt", outputPath + "meh.txt", (err) => { if (err) console.error(err.message)});

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
  console.log("Changes: " + changes.length);

  for (let i in changes)
  {
    let change = changes[i];
    change = change.replace(prefixFilter, "");
    if (change === "." || change === "") continue;
    let fullPathChange = repoPath + "/" + change;
    fs.lstat(fullPathChange, (lstatErr, stats) => {
      if (lstatErr) console.warn("Couldn't get info: " + lstatErr.path + "\t" + lstatErr.message);
      else {
        if (stats.isDirectory()) {
          console.log("Dir: " + change);
          //fs.mkdirSync(outputPath + "/" + change);
        }
        else if (stats.isFile)
        {
          console.log("File: " + change);
          fs.copyFile(fullPathChange, outputPath + change, (error) => {
            if (error) console.error(error.message);
          });
        }
      }
    });
  }
});
