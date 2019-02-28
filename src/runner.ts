import path from 'path';
import {spawn} from 'child_process';

import {log} from './logger';
import {
    ProjectorConfig,
    ProjectorConfigType,
    ProjectorProject,
    SingleCommand
} from './config';

export const RETURN_CODE_SUCCESS = 0;

export class ProjectorConfigRunner {
    public baseDir: string;
    
    private config: ProjectorConfig;
    private cwd: string;

    constructor(
        config: ProjectorConfigType,
        baseDirArg: string,
        private dryRun: boolean = false
    ) {
        this.config = new ProjectorConfig(config);
        
        this.cwd = process.cwd();
        this.baseDir = `${this.cwd}`;
        if (baseDirArg && baseDirArg !== '.') {
            this.baseDir = `${baseDirArg}`;
        }
    }

    private runCommand(
        commandObj: SingleCommand,
        cwd: string = this.cwd
    ): Promise<number> {
        return new Promise(resolve => {
            const {cmd, args: args = []} = commandObj;
            const cmdStr = `${cmd} ${args.join(' ')}`;
        
            log(`Spawning Command: ${cwd} > ${cmdStr}`);

            if (this.dryRun) return resolve(RETURN_CODE_SUCCESS);

            const child = spawn(cmd, args, {cwd});
        
            child.stdout.setEncoding('utf8');
            child.stdout.pipe(process.stdout);
        
            child.stderr.setEncoding('utf8');
            child.stderr.pipe(process.stderr);
        
            child.on('close', returnCode => {
                log(`Done Command: ${cwd} > ${cmdStr} (${returnCode})`);
                resolve(returnCode);
            });
        });
    } 

    private async runCommandListInProject(
        commands: SingleCommand[],
        project: string
    ) {
        let returnCode = RETURN_CODE_SUCCESS;
        for (let i = 0; i < commands.length && returnCode === RETURN_CODE_SUCCESS; i++) {
            returnCode = await this.runCommand(
                commands[i],
                path.join(this.baseDir, project)
            );
        }

        return returnCode;
    }

    // TODO: Extract to config
    private async setupSingleProjectLinks(
        project: ProjectorProject,
        projectPath: string
    ) {
        const linkedProjects = project.linkedProjects;
        if (!linkedProjects || !linkedProjects.length) return RETURN_CODE_SUCCESS;

        log(`Running Script: link[${projectPath}]`);
        return await this.runCommandListInProject(
            this.config.linkCommands(linkedProjects),
            projectPath
        );
    }

    private async runSingleProjectScript(
        project: ProjectorProject,
        projectPath: string
    ) {
        const runnerScripts = project.run;
        if (!runnerScripts || !runnerScripts.length) return RETURN_CODE_SUCCESS;

        let returnCode = RETURN_CODE_SUCCESS;
        for (let i = 0; i < runnerScripts.length && returnCode === RETURN_CODE_SUCCESS; i++) {
            const scriptName = runnerScripts[i];

            const commandsList = this.config.commandsList(scriptName);
            if (!commandsList || !commandsList.length) continue;

            log(`Running Script: ${scriptName}[${projectPath}]`);
            returnCode = await this.runCommandListInProject(
                commandsList,
                projectPath
            );
        }

        return returnCode;
    }

    private async executeEntireProject(
        executeSingleProject: (project: ProjectorProject, projectPath: string) => Promise<number>,
        projectPath: string
    ) {
        const projectObj = this.config.project(projectPath);

        let returnCode = await executeSingleProject(projectObj, projectPath);
        if (returnCode !== RETURN_CODE_SUCCESS) return returnCode;

        const childProjects = projectObj.childProjects;
        if (!childProjects) return RETURN_CODE_SUCCESS;

        const childProjectNames = Object.keys(childProjects);
        for (let i = 0; i < childProjectNames.length && returnCode === RETURN_CODE_SUCCESS; i++) {
            const childProjectName = childProjectNames[i];

            returnCode = await executeSingleProject(
                childProjects[childProjectName],
                path.join(projectPath, childProjectName)
            );
        }

        return returnCode;
    }

    private async setupProjectLinks(projectPath: string) {
        return await this.executeEntireProject(
            this.setupSingleProjectLinks.bind(this),
            projectPath
        );
    }

    private async runProjectScript(projectPath: string) {
        return await this.executeEntireProject(
            this.runSingleProjectScript.bind(this),
            projectPath
        );
    }

    // TODO: Child projects scripts
    public async runConfig() {
        const projectNames = this.config.projectNames();

        if (!projectNames || !projectNames.length) return RETURN_CODE_SUCCESS;

        for (let i = 0; i < projectNames.length; i++) {
            const project = projectNames[i];

            let returnCode = await this.setupProjectLinks(project);
            if (returnCode) return returnCode;

            returnCode = await this.runProjectScript(project);
            if (returnCode !== RETURN_CODE_SUCCESS) return returnCode;
        }

        return RETURN_CODE_SUCCESS;
    }
}
