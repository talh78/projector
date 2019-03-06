import readline from 'readline';
import moment from 'moment';

const TIME_FORMAT = 'HH:mm:ss';

const SUCCESS_CHAR = '*';
const ERROR_CHAR = '!';
const LINE_PREFIX = '<<<<';
const LINE_SUFFIX = '>>>>';

const DEFAULT_PROGRESS_WIDTH = 100;
const COMPLETE_CHAR = '=';
const INCOMPLETE_CHAR = '-';
const progressBarFormat = (bar: string, extra: string) => `[*] [${bar}] ${extra}`;

export class ProjectorLogger {
    private stream = process.stdout;

    private static currentTime() {
        return moment().format(TIME_FORMAT);
    }

    private static formatLog(message: string, error?: boolean) {
        const currentDate = ProjectorLogger.currentTime();
        return `[${error ? ERROR_CHAR : SUCCESS_CHAR}] [${currentDate}] ${LINE_PREFIX} ${message} ${LINE_SUFFIX}`;
    }

    public static log(message: string) {
        readline.clearLine(process.stdout, 1);
        console.log(ProjectorLogger.formatLog(message));
    }

    public static error(message: string) {
        readline.clearLine(process.stderr, 1);
        console.error(ProjectorLogger.formatLog(message, true));
    }

    private commandCount: number = 0;
    private commandsDone: number = 0;

    public setCommandCount(count: number) {
        this.commandCount = Math.max(0, count);
        this.commandsDone = 0;
    }

    public doneCommand() {
        if (this.commandsDone < this.commandCount) {
            this.commandsDone++;
        }
    }

    private renderProgress() {
        const doneRatio = Math.min(Math.max(this.commandsDone / this.commandCount, 0), 1);

        const progressExtraText = `${this.commandsDone} / ${this.commandCount}`;
        const progressText = progressBarFormat('', progressExtraText);

        let availableSpace = DEFAULT_PROGRESS_WIDTH;
        if (this.stream.columns) {
            availableSpace = Math.max(0, this.stream.columns - progressText.length);
        }
        const progressBarWidth = Math.min(DEFAULT_PROGRESS_WIDTH, availableSpace);

        const completeLength = Math.round(progressBarWidth * doneRatio);
        const completeBar = Array(Math.max(0, completeLength + 1)).join(COMPLETE_CHAR);
        const incompleteBar = Array(Math.max(0, progressBarWidth - completeLength + 1)).join(INCOMPLETE_CHAR);
      
        this.stream.write(progressBarFormat(completeBar + incompleteBar, progressExtraText));
        readline.cursorTo(this.stream, 0);
    }

    public logProgress(message: string, formatted: boolean = true) {
        readline.clearLine(this.stream, 1);
        this.stream.write(formatted ? (ProjectorLogger.formatLog(message) + '\n') : message)
        this.renderProgress();
    }
}
