// ----- EXAMENES ----- //

// diferenciamos los periodos de la programacion docente por semestre
// y por ordinarios y extraordinarios
exports.periodoPD = {
  S1_O: '1S-O',
  S1_E: '1S-E',
  S2_O: '2S-O',
  S2_E: '2S-E'
};

// ----- PERMISOS ----- //

const rols = {
  Admin: 'Admin',
  JefeEstudios: 'JefeEstudios',
  ResponsableDocente: 'ResponsableDocente',
  ResponsableDocenteX2: 'ResponsableDocenteDelegado',
  DirectorDepartamento: 'DirectorDepartamento',
  DirectorDepartamentoX2: 'DirectorDepartamentoDelegado',
  CoordinadorTitulacion: 'CoordinadorTitulacion',
  CoordinadorTitulacionX2: 'CoordinadorTitulacionDelegado',
  SecretarioTitulacion: 'SecretarioTitulacion'
};

exports.rols = rols;

// en delegacion se fija un array con los posibles roles delegados. Los delegados pueden hacer todo.
exports.delegacion = {
  [rols.Admin]: [],
  [rols.JefeEstudios]: [rols.SecretarioTitulacion],
  [rols.DirectorDepartamento]: [rols.DirectorDepartamentoX2],
  [rols.CoordinadorTitulacion]: [rols.CoordinadorTitulacionX2],
  [rols.ResponsableDocente]: [rols.ResponsableDocenteX2]
};

// type of permissions
exports.permisions = {
  consultar: 'consultar',
  cumplimentar: 'cumplimentar'
};

// ----- MENU ----- //

exports.menuBar = {
  consultar: {
    nombre: 'consultar',
    submenu: {
      estado: {
        nombre: 'Estado'
      },
      rol: {
        nombre: 'Roles'
      },
      aula: {
        nombre: 'Aulas',
        submenu: {
          aula: {
            nombre: 'Aulas'
          },
          asignacionAulas: {
            nombre: 'AsignacionAulas'
          }
        }
      },
      grupo: {
        nombre: 'Grupos'
      },
      calendario: {
        nombre: 'Calendario'
      },
      profesor: {
        nombre: 'Profesores'
      },
      tribunal: {
        nombre: 'Tribunales'
      },
      horario: {
        nombre: 'Horarios'
      },
      actividad: {
        nombre: 'Actividades'
      },
      examen: {
        nombre: 'Examenes'
      },
      pdf: {
        nombre: 'PDF'
      }
    }
  },

  cumplimentar: {
    nombre: 'cumplimentar',
    submenu: {
      estado: {
        nombre: 'Estado'
      },
      calendario: {
        nombre: 'Calendario'
      },
      profesor: {
        nombre: 'Profesores',
        submenu: {
          profesor: {
            nombre: 'Profesores'
          },
          cumplimentarProfesor: {
            nombre: 'CumplimentarProfesores'
          }
        }
      },
      tribunal: {
        nombre: 'Tribunales'
      },
      horario: {
        nombre: 'Horarios'
      },
      actividad: {
        nombre: 'Actividades'
      },
      examen: {
        nombre: 'Examenes',
        submenu: {
          examen: {
            nombre: 'Examenes'
          },
          franja: {
            nombre: 'Franjas'
          }
        }
      }
    }
  },
  gestion: {
    nombre: 'gestion',
    submenu: {
      estado: {
        nombre: 'AbrirCerrar'
      },
      calendario: {
        nombre: 'Calendario'
      },
      grupo: {
        nombre: 'Grupos'
      },
      personal: {
        nombre: 'Personal'
      },
      rol: {
        nombre: 'Roles'
      },
      acronimo: {
        nombre: 'Acronimos'
      },
      plan: {
        nombre: 'Planes'
      },
      aula: {
        nombre: 'Aulas',
        submenu: {
          aula: {
            nombre: 'Aulas'
          },
          asignacionAulas: {
            nombre: 'AsignacionAulas'
          }
        }
      }
    }
  },
  historial: {
    nombre: 'historial'
  }
};

// ----- CALENDARIO ----- //

exports.eventoGeneral = {
  NoEditable: 0,
  Editable: 1
};

// ordenados por importancia de mayor a menor
exports.eventosTipo = {
  ajuste: 1,
  examenes: 2,
  especial: 3,
  tft: 4,
  festivo: 5,
  otro: 6,
  eliminado: 7
};

exports.coloresEvento = {
  0: 'white',
  1: 'SpringGreen',
  2: 'yellow',
  3: 'red',
  4: 'LightSkyBlue',
  5: 'grey',
  6: 'Orange',
  7: 'white'
};

exports.diasDeSemana = {
  Lunes: 1,
  Martes: 2,
  Miercoles: 3,
  Jueves: 4,
  Viernes: 5,
  Sabado: 6,
  Domingo: 0
};

// ----- GRUPOS ----- //

/**
Especial se reserva para casos raros por ejemplo
Una asingatura que se imparte para ciertos alumnos 
independientemente del grupo pero que no es optativa
*/
exports.tipoGrupo = {
  General: 1,
  Optativa: 2,
  Especial: 3
};
