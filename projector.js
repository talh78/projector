const path = require('path');
const fs = require('fs');
const spawn = require('child_process').spawn;

const RETURN_CODE_SUCCESS = 0;
const DRY_RUN_ARG = '--dry';

const currentDate = () => new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
const log = (message, error) => console.log(`[${error ? '!' : '*'}] <<<<<<<< ${currentDate()} ${message} >>>>>>>>`);

class ProjectorConfigRunner {
    constructor(config, baseDirArg) {
        this.config = config;
        this.cwd = process.cwd();
        this.baseDir = `${this.cwd}`;
        if (baseDirArg && baseDirArg !== '.') {
            this.baseDir = `${baseDirArg}`;
        }
    }

    project(project) { return this.config.projects[project]; }
    projectNames() { return Object.keys(this.config.projects); }
    linkCommand(project) { return {cmd: 'yarn', args: ['link', project]}; }
    linkCommands(linkedProjects) { return linkedProjects.map(linkProject => this.linkCommand(linkProject)); }
    runnerScripts(project) { return this.config.projects[project].run; }
    commandsList(commandName) { return this.config.commands[commandName]; }

    runCommand(commandObj, cwd = this.cwd, dryRun = false) {
        return new Promise(resolve => {
            const {cmd, args: args = []} = commandObj;
            const cmdStr = `${cmd} ${args.join(' ')}`;
        
            log(`Spawning Command: ${cwd} > ${cmdStr}`);

            if (dryRun) return resolve(RETURN_CODE_SUCCESS);

            const child = spawn(cmd, args, {cwd});
        
            child.stdout.setEncoding('utf8');
            child.stdout.pipe(process.stdout);
        
            child.stderr.setEncoding('utf8');
            child.stderr.pipe(process.stderr);
        
            child.on('close', returnCode => {
                log(`Done Command: ${cwd} > ${cmdStr}`);
                resolve(returnCode);
            });
        });
    } 

    async runCommandListInProject(commands, project, dryRun = false) {
        for (let i = 0; i < commands.length; i++) {
            const command = commands[i];

            const cwd = path.join(this.baseDir, project);
            
            const returnCode = await this.runCommand(command, cwd, dryRun);
            if (returnCode !== RETURN_CODE_SUCCESS) return returnCode;
        }

        return RETURN_CODE_SUCCESS;
    }

    // TODO: Extract to config
    async setupSingleProjectLinks(project, projectPath, dryRun = false) {
        const linkedProjects = project.linkedProjects;
        if (!linkedProjects || !linkedProjects.length) return RETURN_CODE_SUCCESS;

        log(`Running Script: link[${projectPath}]`);
        return await this.runCommandListInProject(this.linkCommands(linkedProjects), projectPath, dryRun);
    }

    async setupProjectLinks(projectPath, dryRun = false) {
        const projectObj = this.project(projectPath);

        let returnCode = await this.setupSingleProjectLinks(projectObj, projectPath, dryRun);
        if (returnCode) return returnCode;

        const childProjects = projectObj.childProjects;
        if (!childProjects) return RETURN_CODE_SUCCESS;

        const childProjectNames = Object.keys(childProjects);
        for (let i = 0; i < childProjectNames.length; i++) {
            const childProjectName = childProjectNames[i];

            const childProjectObj = childProjects[childProjectName];
            const childProjectPath = path.join(projectPath, childProjectName);
            returnCode = await this.setupSingleProjectLinks(childProjectObj, childProjectPath, dryRun);
            if (returnCode) return returnCode;
        }
    }

    async runProjectScript(projectName, dryRun) {
        const runnerScripts = this.runnerScripts(projectName);
        if (!runnerScripts || !runnerScripts.length) return RETURN_CODE_SUCCESS;

        for (let i = 0; i < runnerScripts.length; i++) {
            const scriptName = runnerScripts[i];

            const commandsList = this.commandsList(scriptName);
            if (!commandsList || !commandsList.length) return RETURN_CODE_SUCCESS;

            log(`Running Script: ${scriptName}[${projectName}]`);
            const returnCode = await this.runCommandListInProject(commandsList, projectName, dryRun);
            if (returnCode !== RETURN_CODE_SUCCESS) return returnCode;
        }

        return RETURN_CODE_SUCCESS;
    }

    // TODO: Child projects scripts
    async runConfig(dryRun = false) {
        const projectNames = this.projectNames();

        if (!projectNames || !projectNames.length) return RETURN_CODE_SUCCESS;

        for (let i = 0; i < projectNames.length; i++) {
            const project = projectNames[i];

            let returnCode = await this.setupProjectLinks(project, dryRun);
            if (returnCode) return returnCode;

            returnCode = await this.runProjectScript(project, dryRun);
            if (returnCode !== RETURN_CODE_SUCCESS) return returnCode;
        }

        return RETURN_CODE_SUCCESS;
    }
}

const parseCommandLine = args => {
    let parsedArgs = {
        configPath: '',
        baseDir: '.',
        dryRun: false
    };

    args.forEach(arg => {
        if (arg === DRY_RUN_ARG) {
            parsedArgs.dryRun = true;
            return;
        }

        if (!fs.existsSync(arg)) return;

        const argStat = fs.statSync(arg);
        if (argStat.isFile()) {
            parsedArgs.configPath = arg;
            return;
        } else if (argStat.isDirectory()) {
            parsedArgs.baseDir = arg;
            return;
        }
    });

    return parsedArgs;
};

console.time('Total Runtime');
const {configPath, baseDir, dryRun} = parseCommandLine(process.argv.slice(2));

log(`PROJECTOR${dryRun ? ': DRY RUN' : ''}`);

let config = undefined;
try {
    config = require(configPath);
    log(`Loaded Config: ${configPath}`);
} catch(e) {
    console.error(`Error Requiring Config: ${e}`);
    process.exit(1);
}

const runner = new ProjectorConfigRunner(config, baseDir);
log(`Base Directory: ${runner.baseDir}`);

runner.runConfig(dryRun).then(returnCode => {
    log(returnCode ? `Exited with code: ${returnCode}` : 'Done!', returnCode !== RETURN_CODE_SUCCESS);
    console.timeEnd('Total Runtime');
});
