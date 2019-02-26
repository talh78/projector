import path from 'path';
import {spawn} from 'child_process';

import {log} from './logger';
import {ProjectorConfig, ProjectorConfigType, ProjectorProject, SingleCommand} from './config';

export const RETURN_CODE_SUCCESS = 0;

export class ProjectorConfigRunner {
    public baseDir: string;
    
    private config: ProjectorConfig;
    private cwd: string;

    constructor(config: ProjectorConfigType, baseDirArg: string) {
        this.config = new ProjectorConfig(config);
        
        this.cwd = process.cwd();
        this.baseDir = `${this.cwd}`;
        if (baseDirArg && baseDirArg !== '.') {
            this.baseDir = `${baseDirArg}`;
        }
    }

    private runCommand(commandObj: SingleCommand, cwd: string = this.cwd, dryRun: boolean = false): Promise<number> {
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

    private async runCommandListInProject(commands: SingleCommand[], project: string, dryRun: boolean = false) {
        for (let i = 0; i < commands.length; i++) {
            const command = commands[i];

            const cwd = path.join(this.baseDir, project);
            
            const returnCode = await this.runCommand(command, cwd, dryRun);
            if (returnCode !== RETURN_CODE_SUCCESS) return returnCode;
        }

        return RETURN_CODE_SUCCESS;
    }

    // TODO: Extract to config
    private async setupSingleProjectLinks(project: ProjectorProject, projectPath: string, dryRun: boolean = false) {
        const linkedProjects = project.linkedProjects;
        if (!linkedProjects || !linkedProjects.length) return RETURN_CODE_SUCCESS;

        log(`Running Script: link[${projectPath}]`);
        return await this.runCommandListInProject(this.config.linkCommands(linkedProjects), projectPath, dryRun);
    }

    private async setupProjectLinks(projectPath: string, dryRun: boolean = false) {
        const projectObj = this.config.project(projectPath);

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

        return RETURN_CODE_SUCCESS;
    }

    private async runProjectScript(projectName: string, dryRun: boolean = false) {
        const runnerScripts = this.config.runnerScripts(projectName);
        if (!runnerScripts || !runnerScripts.length) return RETURN_CODE_SUCCESS;

        for (let i = 0; i < runnerScripts.length; i++) {
            const scriptName = runnerScripts[i];

            const commandsList = this.config.commandsList(scriptName);
            if (!commandsList || !commandsList.length) return RETURN_CODE_SUCCESS;

            log(`Running Script: ${scriptName}[${projectName}]`);
            const returnCode = await this.runCommandListInProject(commandsList, projectName, dryRun);
            if (returnCode !== RETURN_CODE_SUCCESS) return returnCode;
        }

        return RETURN_CODE_SUCCESS;
    }

    // TODO: Child projects scripts
    public async runConfig(dryRun: boolean = false) {
        const projectNames = this.config.projectNames();

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
