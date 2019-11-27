let CronJob = require('cron').CronJob;
let apiUpmController = require('./apiUpm_controller');
let abrirProgDoc2Controller = require('./abrirProgDoc2_controller');
//ejemplo cada 10 segundos: '*/10 * * * * *'
//cada dia a las 00:00:00
new CronJob('0 0 0 * * *', async function() {
    await apiUpmController.updatePlanesAndDeparts();
    await abrirProgDoc2Controller.borrarPdsWithErrores();
    //mas funciones programadas
}, null, true, 'Europe/Madrid');