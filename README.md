# CopySvnUpdates
Operates on an SVN repo. Given a revision number, copies all files which were modified or changed since then into a new directory. Useful for bringing in updates from an SVN repo into another type of repo (like git or mercurial), or into a project without version control. Also outputs a list of removed files.

## Usage

    copysvnupdates -o <outputPath> [-p <repoPath> -r <revisionNumber> --force]

## Example

    copysvnupdates -p ~/MyLibraryRepo -r 1234 -o ~/MyToolUsingLibrary --force
