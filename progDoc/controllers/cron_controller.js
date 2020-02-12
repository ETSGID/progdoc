const { CronJob } = require('cron');
const apiUpmController = require('./apiUpm_controller');
const abrirProgDoc2Controller = require('./abrirProgDoc2_controller');
// ejemplo cada 10 segundos: '*/10 * * * * *'
// cada dia a las 00:00:00
// eslint-disable-next-line no-new
new CronJob('0 0 0 * * *', (async () => {
  await apiUpmController.updatePlanesAndDeparts();
  await abrirProgDoc2Controller.borrarPdsWithErrores();
  // mas funciones programadas
}), null, true, 'Europe/Madrid');

// TODO CronJob para eliminar las PD con más de dos años
