const { CronJob } = require('cron');
const apiUpmController = require('./apiUpm_controller');
const progDocController = require('./progDoc_controller');
const calendarioController = require('./calendario_controller');
// ejemplo cada 10 segundos: '*/10 * * * * *'
// cada dia a las 00:00:00: '0 0 0 * * *'
//
// eslint-disable-next-line no-new
new CronJob(
  '*/10 * * * * *',
  async () => {
    await apiUpmController.updatePlanesAndDeparts();
    await progDocController.borrarPdsWithErrores();
    await progDocController.borrarPdsAntiguas();
    await calendarioController.borrarCalendarioAntiguos();
    // mas funciones programadas
  },
  null,
  true,
  'Europe/Madrid'
);
