import program from 'commander';

import {log} from './logger';
import {ProjectorConfigType} from './config';
import {ProjectorConfigRunner, RETURN_CODE_SUCCESS} from './runner';

const DEFAULT_BASE_DIR = '.';

console.time('Total Runtime');

program
    .version('0.0.2')
    .option('-c, --config <path>', 'Config File Path')
    .option('-d, --dir <path>', 'Base Directory Path')
    .option('--dry', 'Perform Dry Run')
    .parse(process.argv);

if (typeof program.config === 'undefined') {
    program.help();
}

log(`PROJECTOR START${program.dry ? ': DRY RUN' : ''}`);

try {
    const config: ProjectorConfigType = require(program.config);
    log(`Loaded Config: ${program.config}`);

    const baseDir = program.dir || `${DEFAULT_BASE_DIR}`;
    const runner = new ProjectorConfigRunner(config, baseDir);
    log(`Base Directory: ${runner.baseDir}`);

    runner.runConfig(program.dry).then(returnCode => {
        log(returnCode ? `Exited with code: ${returnCode}` : 'Done!', returnCode !== RETURN_CODE_SUCCESS);
        console.timeEnd('Total Runtime');
    });
} catch(e) {
    console.error(`${e}`);
    process.exit(1);
}
