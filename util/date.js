const dayjs = require('dayjs');
const buddhistEra = require('dayjs/plugin/buddhistEra');
dayjs.extend(buddhistEra);

const ADtoBE = (date) => {
    return dayjs(date).format("BBBB-MM-DD");
}

module.exports = { ADtoBE }