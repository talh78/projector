export function log(message: string, error?: boolean) {
    const currentDate = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    console.log(`[${error ? '!' : '*'}] <<<<<<<< ${currentDate} ${message} >>>>>>>>`);
}
