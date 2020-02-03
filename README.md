# Progdoc

## Descripción
Aplicación del portal de profesores para crear/ver/modificar las programaciones docentes de los planes de la ETSIT

## Ficheros
Dentro de la carpeta  se encuentra todos los ficheros necesarios para el correcto despliegue de la aplicación. Posteriormente se comentarán en detalle.


## Variables de entorno en producción

Son necesariuos tres archivos para configurar el entorno

`docker-compose.override.yml`

```
version: '3'

services:
  dbsession:
    container_name: gestiondoc_dbsession
    env_file:
      - ../config/gestionDoc/gestionDocSession.env
  progdoc:
    build: 
      context: .
    env_file:
      - ../config/gestionDoc/gestionDoc.env

volumes:
  dbdata:
```
`progDoc.env`

```

POSTGRES_DB=progdoc
DB_USERNAME=user db con información
DB_PASSWORD=xxxx
DB_HOST=host en la que esta la bbdd el puerto es 5432 (el de postgres). Ejemplo: localhost
POSTGRESSESION_DB=progdocsession
DBSESSION_USERNAME=user db de sesiones
DBSESSION_PASSWORD=xxxx
SERVICE=url servicio sin contexto ejemplo:https://pruebas.etsit.upm.es 
CAS=url servidor cas: ejemplo:https://repo.etsit.upm.es/cas-upm
SESSION_SECRET=Secreto_para_las_sesiones
CONTEXT=/progdoc/ debe empezar con barra y terminar con barra
PATH_PDF=/storage/progdoc/ debe terminar con barra
DEV=false
PRUEBAS=false
DOCKER=true
PORT=3000

```

`progDocSession.env`

```
POSTGRES_DB=progdocsession
POSTGRES_USER=user db de sesiones
POSTGRES_PASSWORD=xxxx
```

Se proporciona un Dockerfile para la imagen que alojará el servidor, un script para la puesta en marcha de las bases de datos y el servidor, y un `docker-compose.yml` para el despliegue de toda la aplicación. 
Dentro de la carpeta `progDoc`, está el código de la aplicación.

## Variables de entorno en desarrollo

Son necesariuos cuatro archivos para configurar el entorno

`docker-compose.override.yml`

```
version: '3'

services:

  db:
    container_name: gestiondoc_db
    image: postgres:9.6
    restart: always
    volumes:
      - dbdata:/var/lib/postgresql/data
    env_file:
      - ../config/gestionDoc/gestionDocDB.env
  dbsession:
    container_name: gestiondoc_dbsession
    env_file:
      - ../config/gestionDoc/gestionDocSession.env
  progdoc:
    build: 
      context: .
    depends_on:
      - db
    env_file:
      - ../config/gestionDoc/gestionDoc.env

volumes:
  dbdata:
```
`progDoc.env`

```

POSTGRES_DB=progdoc
DB_USERNAME=user db con información
DB_PASSWORD=xxxx
DB_HOST=db (obligatoriamente)
POSTGRESSESION_DB=progdocsession
DBSESSION_USERNAME=user db de sesiones
DBSESSION_PASSWORD=xxxx
SERVICE=url servicio sin contexto ejemplo:https://pruebas.etsit.upm.es 
CAS=url servidor cas: ejemplo:https://repo.etsit.upm.es/cas-upm
SESSION_SECRET=Secreto_para_las_sesiones
CONTEXT=/progdoc/ debe empezar con barra y terminar con barra
PATH_PDF=/storage/progdoc/ debe terminar con barra
DEV=false
PRUEBAS=true
DOCKER=true
PORT=3000

```
`progDocDB.env`

```
POSTGRES_DB=progdoc
POSTGRES_USER=user db con información
POSTGRES_PASSWORD=xxxx

```
`progDocSession.env`

```
POSTGRES_DB=progdocsession
POSTGRES_USER=user db de sesiones
POSTGRES_PASSWORD=xxxx
```

Se proporciona un Dockerfile para la imagen que alojará el servidor, un script para la puesta en marcha de las bases de datos y el servidor, y un `docker-compose.yml` para el despliegue de toda la aplicación. 
Dentro de la carpeta `progDoc`, está el código de la aplicación. 

## Puertos
El puerto en el que corre la aplicación dentro del contenedor es el `3000` (Ver fichero `progDoc/file.env`). Por defecto este puerto se mapea en el `docker-compose-yml` al puerto `3000` del host. Para cambiarlo, modificar el primero de los dos puertos, es decir `"HOST:CONTAINER"`. 

## Bases de datos
Existen dos bases de datos una para almacenar las sesiones y otra con la información de la aplicación. Por ahora la conexión es a travéś de una red privada.
Deben configurarse los archivos donde se le pase las variables de entorno para la creación y conexión de la aplicación

## Almacenamiento de pdfs y csv
Los pdfs se almacenan en el volumen progdoc:/storage/progdoc
Si se desea cambiar la carpeta: `/storage/progdoc/` debe hacerse tanto en `progDoc.env` como en `docker-compose.yml`
Si se meten los pdfs a mano deben meterse con la carpeta completa `pdfs` quedando `/storage/progdoc/pdfs/`

## Gestor de archivos
La configuración del gestor de archivos se realiza en el fichero de confguración `/progDoc/public/config/filemanager.config.json` y en concreto en la línea `"connectorUrl"` debe indicarse el `contexto` + `"archivos/filemanager"`.
A modo de ejemplo `"connectorUrl": "/pdi/progdoc/archivos/filemanager"`

## Ejecución en producción
Una vez configuradas las variables de entorno y el puerto correctamente, para desplegar la aplicación, hay que ir al directorio `progDoc`, y desde ahí ejecutar el siguiente comando:


```
# Construir el proyecto llamando a los ficheros de configuración creados en la carpeta externa al proyecto
docker-compose build

# Arrancar los contenedores llamando a los ficheros de configuracón creados en la carpeta externa al proyecto
docker-compose up -d

#para llenar la base de datos
psql -U [userpostgres] -h localhost  [database] < [file.sql]
```

## Ejecución en desarrollo
Una vez configuradas las variables de entorno y el puerto correctamente, para desplegar la aplicación, hay que ir al directorio `progDoc`, y desde ahí ejecutar el siguiente comando:


```
# Construir el proyecto llamando a los ficheros de configuración creados en la carpeta externa al proyecto
docker-compose build

# Arrancar los contenedores llamando a los ficheros de configuracón creados en la carpeta externa al proyecto
docker-compose up -d

#para llenar la base de datos
psql -U [userpostgres] -h localhost  [database] < [file.sql]

```

## Nota adicional
El fichero `progDoc/script.sh`, se ejecuta cuando termina de arrancar el contenedor que aloja el servidor para migrar y rellenar la base de datos. Posteriormente arranca el servidor. En este proceso se hace un sleep de 30 segundos para esperar a que las bases de datos terminen de arrancar. En caso de fallo, alargar este sleep. 

## Enlaces relevantes
[Variables de entorno desde `docer-compose.ym`](https://docs.docker.com/compose/environment-variables/)
[Contenedor postgres](https://hub.docker.com/_/postgres/)
[Problemas con variables de entorno en el contenedor postgres](https://github.com/docker-library/postgres/issues/203)

