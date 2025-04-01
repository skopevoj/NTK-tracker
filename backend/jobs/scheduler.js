var cron = require('node-cron');

cron.schedule('*/1 * * * * *', () => {
    console.log('running every 5 seconds');
});