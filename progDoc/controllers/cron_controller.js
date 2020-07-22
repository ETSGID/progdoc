const { CronJob } = require('cron');
const apiUpmController = require('./apiUpm_controller');
const progDocController = require('./progDoc_controller');
// ejemplo cada 10 segundos: '*/10 * * * * *'
// cada dia a las 00:00:00
// eslint-disable-next-line no-new
new CronJob(
  '0 0 0 * * *',
  async () => {
    await apiUpmController.updatePlanesAndDeparts();
    await progDocController.borrarPdsWithErrores();
    // mas funciones programadas
  },
  null,
  true,
  'Europe/Madrid'
);

// TODO CronJob para eliminar las PD con más de dos años
