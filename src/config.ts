export interface ProjectorProject {
    run?: string[];
    linkedProjects?: string[];
    childProjects?: Record<string, ProjectorProject>;
}

export interface SingleCommand {
    cmd: string;
    args?: string[];
}

export interface ProjectorConfigType {
    projects: Record<string, ProjectorProject>;
    commands: Record<string, SingleCommand[]>;
}

export class ProjectorConfig {
    constructor(public config: ProjectorConfigType) {}

    public project(project: string) { return this.config.projects[project]; }
    public projectNames() { return Object.keys(this.config.projects); }

    private linkCommand(project: string): SingleCommand { return {cmd: 'yarn', args: ['link', project]}; }
    public linkCommands(linkedProjects: string[]) { return linkedProjects.map(linkProject => this.linkCommand(linkProject)); }

    public commandsList(commandName: string) { return this.config.commands[commandName]; }
}