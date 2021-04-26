# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## [1.0.11] - 2021-04-26
### Fixed
- Sanetizar acronimos plan y asignaturas
### Changed
- Rol SubdirectorPosgrado por rol Admin

## [1.0.10] - 2021-03-06
### Added
- Log de cada usuario de la primera vez en cada sesión
### Changed
- Estructura migraciones, seeders y configuración de conexión a las bases de datos

## [1.0.9] - 2021-01-29
### Fixed
- Mostrar actividades la última semana
- Contar días calendario

## [1.0.8] - 2020-09-16
### Changed
- **API REST endpoints**
- Mostrar en el pdf de color verde todas las asignaturas nuevas comparando con versión 0 y versión anterior.


## [1.0.7] - 2020-09-07
### Added
- Subsubmenu en sesión.
- **Migración trasladar aulas y modificar Grupos**.
- **Comparar tribunales con la versión anterior y curso anterior en pdf**.
- **Generar toda la base de datos con migraciones**.
- **Borrar progdocs y calendarios antiguas**.
- **Borrar progdoc sin cambios o incidencia**.
- Añadir información en pestaña retraer estado.
- **Seeders TFG y TFM**.
### Changed
- Cambiar de exámenes a franjas con botones en vez de select.
- **Sólo mostrar asignaturas con acrónimos**.
- **Pestaña Aulas**.
- Actualizar versión de Bootstrap y Bootsrap-select a la versión 3.4.1.
- Modo de conexión a la base de datos desde el Backend.
- Renombrar functions.js(.ejs) to helpers.js(.ejs).
- Estilo CSS.
- **Separar routers en *Consultar, Cumplimentar, Gestión e Historial***.
- Tareas cron a las 00:00:00 todos los días.
- Update README.md
- Modificar orden pestañas Consultar.
- Cambiar *Gestión* por *Jefatura Estudios*.
- Backend Calendario.
- Cambiar textos *Aprobar* por *Confirmar* en Cumplimentar.
- Actualizar pdf ayuda.
- Modificar orden pestañas Cumplimentar.
### Fixed
- Bug intercambio horarios cuando hay varias asignaturas en misma hora.
- Sanetizar acrónimos para cambiar `_` y  `/` por `-`
- Poblemas estilo Eslint.
- Warning trasladar calendario al tratar fechas.
- Datepicker position.

## [1.0.6] - 2020-07-08
### Added
- **.dockerignore**
### Changed
- Colores de Aulas .
- Orden pestañas de Jefatura Estudios.
- **Dockerfile** instalación módulos con *npm ci*.
### Fixed
- Modal Actividades calendario *orientation top*.
- Bug intercambios Horarios.

## [1.0.5] - 2020-06-30
### Added
- Desplazamiento de **Exámenes**.
- Consultar **roles usuario** en página inicial.

### Changed
- Consultar **calendario general** en pestaña consultar si no está aprobado.
- **Calendario general** en pdf si no está aprobado.
- Consultar **aulas** también en pestaña consultar.

## [1.0.4] - 2020-06-17
### Added
- Gestión de **Personal**.

### Changed
- Autocorrect off en input text


## [1.0.3] - 2020-06-08
### Added
- Intercambios por horas y días en **Horarios**.

### Changed
- Cumplimentar **exámenes** con ajax.

## [1.0.2] - 2020-05-21
### Added
- **Footer** con la versión.
- Header **pdf** incluyendo la fecha y el plan.

### Changed
- Cumplimentar **horarios** con ajax.

### Fixed
- Sanetizar nombre **acrónimos** para que conviert `_` en `-`.

## [1.0.1] - 2020-05-04
### Changed
- Cambio de estructura carpetas en **Historial** y añadir acrónimos en el nombre de los ficheros.

## [1.0.0] - 2020-04-21
- **Primera versión** del registro de contenedores.

