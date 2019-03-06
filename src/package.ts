import path from 'path';

import {ProjectorSingleCommand, stringifyCommand} from './config';

export class ProjectorPackage {
    constructor(
        public scriptName: string,
        public projectPath: string,
        public commands: ProjectorSingleCommand[]
    ) {}

    public static commandCount(packages: ProjectorPackage[]) {
        return packages.reduce((count, currPackage) => {
            count += currPackage.commands.length;
            return count;
        }, 0);
    }

    public toString(baseDir: string = '') {
        const {scriptName, projectPath, commands} = this;
        return `
${projectPath} [${scriptName}]:
${commands.map(command => ` - ${path.join(baseDir, projectPath)} > ${stringifyCommand(command)}`).join('\n')}`;
    }
}