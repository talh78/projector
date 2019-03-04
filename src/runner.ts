import path from 'path';
import {spawn} from 'child_process';

import {log} from './logger';
import {
    ProjectorConfig,
    ProjectorConfigType,
    ProjectorProject,
    SingleCommand
} from './config';

export interface ProjectorPackage {
    scriptName: string;
    projectPath: string;
    commands: SingleCommand[];
}

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
        command: SingleCommand,
        cwd: string = this.cwd
    ): Promise<number> {
        return new Promise(resolve => {
            const {cmd, args: args = []} = command;
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

    private async runPackage({scriptName, projectPath, commands}: ProjectorPackage) {
        log(`Running Script: ${scriptName}[${projectPath}]`);

        let returnCode = RETURN_CODE_SUCCESS;
        for (let i = 0; i < commands.length && returnCode === RETURN_CODE_SUCCESS; i++) {
            returnCode = await this.runCommand(
                commands[i],
                path.join(this.baseDir, projectPath)
            );
        }

        return returnCode;
    }

    // TODO: Extract to config
    private packageSingleProjectLinks(
        project: ProjectorProject,
        projectPath: string
    ): ProjectorPackage[] {
        const linkedProjects = project.linkedProjects;
        if (!linkedProjects || !linkedProjects.length) return [];

        return [{
            scriptName: 'link',
            projectPath,
            commands: this.config.linkCommands(linkedProjects)
        }];
    }

    private packageSingleProjectScripts(
        project: ProjectorProject,
        projectPath: string
    ): ProjectorPackage[] {
        const scripts = project.run;
        if (!scripts || !scripts.length) return [];

        return scripts.reduce((packages, scriptName) => {
            const commands = this.config.commands(scriptName);
            if (!commands || !commands.length) return packages;

            return packages.concat([{
                scriptName,
                projectPath,
                commands
            }]);
        }, [] as ProjectorPackage[]);
    }

    private packageEntireProject(
        packageSingleProject: (project: ProjectorProject, projectPath: string) => ProjectorPackage[],
        projectPath: string
    ) {
        const project = this.config.project(projectPath);

        let projectPackages = packageSingleProject(project, projectPath);

        const childProjects = project.childProjects;
        if (!childProjects) return projectPackages;

        const childProjectNames = Object.keys(childProjects);
        return childProjectNames.reduce((packages, childProjectName) => packages.concat(
            packageSingleProject(
                childProjects[childProjectName],
                path.join(projectPath, childProjectName)
            )
        ), projectPackages);
    }

    private packageProjectLinks(projectPath: string) {
        return this.packageEntireProject(
            this.packageSingleProjectLinks.bind(this),
            projectPath
        );
    }

    private packageProjectScripts(projectPath: string) {
        return this.packageEntireProject(
            this.packageSingleProjectScripts.bind(this),
            projectPath
        );
    }

    public packageConfig() {
        const projectNames = this.config.projectNames();
        if (!projectNames || !projectNames.length) return [];

        return projectNames.reduce((packages, project) => 
            packages
                .concat(this.packageProjectLinks(project))
                .concat(this.packageProjectScripts(project))
        , [] as ProjectorPackage[]);
    }

    public async runConfig() {
        const configPackages = this.packageConfig();

        let returnCode = RETURN_CODE_SUCCESS;
        for (let i = 0; i < configPackages.length && returnCode === RETURN_CODE_SUCCESS; i++) {
            returnCode = await this.runPackage(configPackages[i]);
        }

        return returnCode;
    }
}
