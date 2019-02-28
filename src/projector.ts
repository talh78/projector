import program from 'commander';
const {version} = require('../package.json');

import {log} from './logger';
import {ProjectorConfigType} from './config';
import {ProjectorConfigRunner, RETURN_CODE_SUCCESS} from './runner';

const DEFAULT_BASE_DIR = '.';

program
    .version(version)
    .option('-c, --config <path>', 'Config File Path')
    .option('-d, --dir <path>', 'Base Directory Path')
    .option('--dry', 'Perform Dry Run')
    .parse(process.argv);

if (typeof program.config === 'undefined') {
    program.help();
}

log(`PROJECTOR START${program.dry ? ': DRY RUN' : ''}`);

try {
    console.time('Total Runtime');

    const config: ProjectorConfigType = require(program.config);
    log(`Loaded Config: ${program.config}`);

    const baseDir = program.dir || `${DEFAULT_BASE_DIR}`;
    const runner = new ProjectorConfigRunner(config, baseDir, !!program.dry);
    log(`Base Directory: ${runner.baseDir}`);

    runner.runConfig().then(returnCode => {
        const success = returnCode === RETURN_CODE_SUCCESS;
        log(success ? 'Done!' : `Exited with code: ${returnCode}`, !success);
        console.timeEnd('Total Runtime');
    });
} catch(e) {
    console.error(`${e}`);
    process.exit(1);
}
