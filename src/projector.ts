import fs from 'fs';

import {log} from './logger';
import {ProjectorConfigType} from './config';
import {ProjectorConfigRunner, RETURN_CODE_SUCCESS} from './runner';

const DRY_RUN_ARG = '--dry';

const parseCommandLine = (args: string[]) => {
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

try {
    const config: ProjectorConfigType = require(configPath);
    log(`Loaded Config: ${configPath}`);

    const runner = new ProjectorConfigRunner(config, baseDir);
    log(`Base Directory: ${runner.baseDir}`);

    runner.runConfig(dryRun).then(returnCode => {
        log(returnCode ? `Exited with code: ${returnCode}` : 'Done!', returnCode !== RETURN_CODE_SUCCESS);
        console.timeEnd('Total Runtime');
    });
} catch(e) {
    console.error(`${e}`);
    process.exit(1);
}
