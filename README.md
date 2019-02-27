# Projector
A script for setting up work environments and generic command running

# How to run:
```
node projector.js -c <Config File Path> [-d <Base Directory Path>]  [--dry]
```

# Parameters:
 - Config File Path: Path to the Projector config file
 - Base Directory Path: A base directory where all projects in the config file are located (default: Current Directory)
 - --dry: (Optional) Perform a dry run and just print out the commands that will be run

# Config File Structure:
 - projects: An object mapping a project name to a project config object
    - run: A list of script names to run, in order
    - linkedProjects: A list of project to link to before running the scripts
    - childProjects: An object mapping a child project name to a project config object
 - commands: An object mapping a script name to a command list
