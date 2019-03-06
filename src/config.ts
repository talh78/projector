export interface ProjectorProject {
    run?: string[];
    linkedProjects?: string[];
    childProjects?: Record<string, ProjectorProject>;
}

export interface ProjectorSingleCommand {
    cmd: string;
    args?: string[];
}

export interface ProjectorConfigType {
    projects: Record<string, ProjectorProject>;
    commands: Record<string, ProjectorSingleCommand[]>;
}

export const stringifyCommand = ({cmd, args: args = []}: ProjectorSingleCommand) => `${cmd} ${args.join(' ')}`;

const linkCommand = (project: string) => ({
    cmd: 'yarn',
    args: ['link', project]
}) as ProjectorSingleCommand;

export class ProjectorConfig {
    constructor(public config: ProjectorConfigType) {}

    public project(project: string) { return this.config.projects[project]; }
    public projectNames() { return Object.keys(this.config.projects); }

    public linkCommands(linkedProjects: string[]) { return linkedProjects.map(linkCommand); }

    public commands(scriptName: string) { return this.config.commands[scriptName]; }
}
