import program from 'commander';
import moment from 'moment';
const {version} = require('../package.json');

import {ProjectorLogger} from './logger';
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

const {log, error} = ProjectorLogger;
const startTime = moment.now();
log('PROJECTOR START' + (program.dry ? ' - DRY RUN' : ''));

// TODO: Input validation (paths exist, error if not) with formatted error messages
try {
    const config: ProjectorConfigType = require(program.config);
    log(`Loaded Config: ${program.config}`);

    const baseDir = program.dir || `${DEFAULT_BASE_DIR}`;
    const runner = new ProjectorConfigRunner(config, baseDir, !!program.dry);
    log(`Base Directory: ${runner.baseDir}`);

    runner.runConfig().then(returnCode => {
        const runtimeStr = !program.dry ? ` Total Runtime: ${moment().diff(startTime, 'seconds', true)}s` : '';
        const success = returnCode === RETURN_CODE_SUCCESS;
        if (success) {
            log('Done!' + runtimeStr);
        } else {
            error(`Exited with code: ${returnCode}.` + runtimeStr);
        }
    });
} catch(e) {
    console.error(`${e}`);
    process.exit(1);
}
