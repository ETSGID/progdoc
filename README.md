# Progdoc
[[_TOC_]]

## Descripción
Servicio que permite consultar y planificar el curso académico actual y siguiente de todos los planes impartidos en la escuela. La aplicación está accesible desde el [portal del PDI en la página de la ETSIT](https://portal.etsit.upm.es/pdi/)

## Requisitos de SW
- Servidor PostgreSQL versión 11
- Node.js versión 12
- npm versión  6

## Consideraciones previas
En la [Wiki general](https://git.etsit.upm.es/grupointegraciondigital/wiki/-/wikis/home) de los proyectos se incluye alguna información de utilidad:
- Mapeo de puertos proxy inverso de la ETSIT: [Entorno de desarrollo, pruebas, producción y local](https://git.etsit.upm.es/grupointegraciondigital/wiki/-/wikis/Entorno-de-desarrollo,-pruebas,-producci%C3%B3n-y-local).
- Servicios y servidor CAS: [Entorno de desarrollo, pruebas, producción y local](https://git.etsit.upm.es/grupointegraciondigital/wiki/-/wikis/Entorno-de-desarrollo,-pruebas,-producci%C3%B3n-y-local).
- Conexión con el servidor CAS: [CAS, Central Authentication Service](https://git.etsit.upm.es/grupointegraciondigital/wiki/-/wikis/Servicios-externos/CAS,-Central-Authentication-Service).
- Campos devueltos por el CAS: [CAS, Central Authentication Service](https://git.etsit.upm.es/grupointegraciondigital/wiki/-/wikis/Servicios-externos/CAS,-Central-Authentication-Service).


## Puertos
### Docker
El puerto en el que corre la aplicación dentro del contenedor es el `3000` (Ver fichero `progDoc/file.env`). Por defecto este puerto se mapea en el `docker-compose-yml` al puerto `3000` del host. Para cambiarlo, modificar el primero de los dos puertos, es decir `"HOST:CONTAINER"`. No modificar el puerto de dentro del contenedor.

### Sin Docker
El puerto por defecto es el `3000`. Para cambiarlo, modificar el la variable de entorno PORT [Ver sección de despliegue en localhost](#desarrollo-localhost).

## Bases de datos
Existen dos bases de datos una para almacenar las sesiones y otra con la información de la aplicación.

### Requisitos de las bases de datos

En **producción** deben realizarse copias de seguridad de la base de datos que contiene la información. Lo ideal es tener las siguientes copias:

- Copia diaria completa de los datos que requieran respaldo.
- Almacenar las copias diarias de los últimos siete días borrando las anteriores.
- Almacenar una copia mensual de los últimos doce meses.
- Almacenar una copia anual del último año.

Con esta estrategia se evita que el número de copias aumente con el paso del tiempo. En este caso será constante y contará con 20 copias (7 diarias, 12 mensuales, 1 anual).

### Inicialización de la base de datos
#### Con Docker
Se crea automáticamente la base de datos y se ejecutan las migraciones y los seeders.

#### Sin Docker
**La primera vez que se ejecute el proyecto** es necesario generar el esqueleto de la base de datos y rellenar alguna información adicional. Para ello se usarán las migraciones y seeders.
1. `cd progDoc`
1. `npm install`
1. Configurar las variables de entorno. [Ver sección de despliegue en localhost](#desarrollo-localhost).
1. Crear manualmente el usuario de la base de datos si no existe
1. Crear las bases de datos: `npm run createDb`  y `npm run createDbSession`
1. Ejecutar migraciones `npm run migrations`
1. Ejecutar seeders `npm run seeders`

En `package.json` están la **lista de comandos disponibles completa.**


### Restore datos


```shell
#para importar la base de datos es necesario acceder a la base de datos y copiar el fichero con la bbdd
psql -U [userpostgres] -h localhost  [database] < [file.sql]

#file.sql puede contener toda la base de datos, el esquema o solo los datos. En docker se debe borrar el volumen dbdata de la bbdd ya que sino seguirá la versión anterior.
```
Dependiendo del caso será necesario eliminar las migraciones y/o los seeders antes de restaurarla ya que puede dar fallos si ya existen las tablas y las intenta volver a crear o sí los seeders ya han creado los datos e intenta volver a crearlos.

**Si la base de datos está en un contenedor Docker**: 

1. Debe eliminarse el volumen inicial de la base datos y detener la ejecución de los contenedores: `docker-compose down --v`
1. Debe arrancarse la base de datos sin el contenedor de la aplicación: `docker-compose up -d db`
1. Importar la base de datos completa (esquema + datos): `psql -U [userpostgres] -h localhost  [database] < [file.sql]`
1. Arrancar todo el escenario de nuevo: `docker-compose up -d`

## Almacenamiento de ficheros (pdfs y csv)
Los pdfs se almacenan en el volumen `progdoc:/storage/progdoc`
Si se desea cambiar la carpeta: `/storage/progdoc/` debe hacerse tanto en `progDoc.env` como en `docker-compose.yml`
Si se meten los pdfs a mano deben meterse con la carpeta completa `pdfs` quedando `/storage/progdoc/pdfs/`. **Deben utilizarse rutas absolutas para configurar la variable de entorno**

### Requisitos de almacenamiento de ficheros
En **producción** deben realizarse copias de seguridad del sistema de ficheros de la aplicación.


## Gestión de roles
En desarrollo se puede utilizar `USER_DEV` para simular cualquier ROL
Además el rol Admin deja realizar todas las acciones
Otra opción en desarrollo es meter en la base de datos a la persona y asignarle el rol deseado.
Por ejemplo:

```
UPDATE public."Rols" SET "PersonaId"= 282 WHERE identificador=1;
INSERT INTO public."Rols"(rol, "PersonaId") VALUES ('Admin', 282);

```

## Configuración de entornos

### Producción

El despliegue en producción es gestionado por el **GICO**.

#### docker-compose.override.yml

Ejemplo de configuración de docker. Complementa a la configuración del `docker-compose.yml`. En este ejemplo existen **dos** servicios: `dbsession` y `progdoc`. La base de datos con la información de las programaciones docentes no está alojada en un contenedor.

`docker-compose.override.yml`

```
version: '3'
services:
  progdoc:
    image: git.etsit.upm.es:4567/grupointegraciondigital/gestiondoc:stable
    env_file:
      - ../config/gestionDoc/gestionDoc.env
volumes:
  dbdata:
```

#### Variables de entorno (DEV=false,PRUEBAS=false, DOCKER=true)

Son necesariuos **dos** archivos para configurar el entorno.


`gestionDoc.env`

```

POSTGRES_DB=programacion_docente
DB_USERNAME=progdoc_user
DB_PASSWORD=progdoc
DB_HOST=db
POSTGRESSESION_DB=progdocsession
DBSESSION_USERNAME=progdoc_user
DBSESSION_PASSWORD=progdoc
SERVICE=https://pruebas.etsit.upm.es #url servicio sin contexto
CAS=https://siupruebas.upm.es/cas #url servidor cas
SESSION_SECRET=xxxx
CONTEXT=/pdi/progdoc
PATH_PDF=/storage/progdoc
DEV=false
PRUEBAS=false
DOCKER=true

```

`gestionDocSession.env`

```
POSTGRES_DB=progdocsession
POSTGRES_USER=progdoc_user
POSTGRES_PASSWORD=progdoc
```


#### Ejecución
Una vez configuradas las variables de entorno y el puerto correctamente, para desplegar la aplicación se utiliza la imagen con etiqueta `stable` subida al gitlab: 

```
git.etsit.upm.es:4567/grupointegraciondigital/gestiondoc:stable
```

```
# Arrancar los contenedores llamando a los ficheros de configuracón creados en la carpeta externa al proyecto
docker-compose up -d
```

Conectarse en http://portal.etsit.upm.es/pdi/progdoc

### Pruebas: host27

#### docker-compose.override.yml

Ejemplo de configuración de docker. Complementa a la configuración del `docker-compose.yml`. En este ejemplo existen **tres** servicios: `db`, `dbsession` y `progdoc`. La base de datos con la información de las programaciones docentes no está alojada en un contenedor.

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
#    image: git.etsit.upm.es:4567/grupointegraciondigital/gestiondoc:stable
    depends_on:
      - db
    env_file:
      - ../config/gestionDoc/gestionDoc.env

volumes:
  dbdata:
```

#### Variables de entorno (DEV=false,PRUEBAS=true, DOCKER=true)

Son necesariuos **tres** archivos para configurar el entorno

`gestionDoc.env`

```
POSTGRES_DB=programacion_docente
DB_USERNAME=progdoc_user
DB_PASSWORD=progdoc
DB_HOST=db
POSTGRESSESION_DB=progdocsession
DBSESSION_USERNAME=progdoc_user
DBSESSION_PASSWORD=progdoc
SERVICE=https://pruebas.etsit.upm.es #url servicio sin contexto
CAS=https://siupruebas.upm.es/cas #url servidor cas
SESSION_SECRET=xxxx
CONTEXT=/pdi/progdoc
PATH_PDF=/storage/progdoc
DEV=false
PRUEBAS=true
DOCKER=true

```
`gestionDocDB.env`

```
POSTGRES_DB=programacion_docente
POSTGRES_USER=progdoc_user
POSTGRES_PASSWORD=progdoc
```
`gestionDocSession.env`

```
POSTGRES_DB=progdocsession
POSTGRES_USER=progdoc_user
POSTGRES_PASSWORD=progdoc
```


#### Ejecución
Una vez configuradas las variables de entorno y el puerto correctamente, para desplegar la aplicación, hay que ir al directorio `progDoc`, y desde ahí ejecutar el siguiente comando:


```
# Construir el proyecto llamando a los ficheros de configuración creados en la carpeta externa al proyecto
docker-compose build

# Arrancar los contenedores llamando a los ficheros de configuracón creados en la carpeta externa al proyecto
docker-compose up -d

```

Alternativamente
```
docker-compose up -d --build
```
Conectarse en http://pruebas.etsit.upm.es/pdi/progdoc (necesario estar en la red de la UPM)

#### Generar imagen para producción

- La versión debe especifiarse además de en la imagen en el `package.json`
- Actualizar el [CHANGELOG.md](./CHANGELOG.md)
- Generar las imágenes y subirlas a gitlab. Para ello se deben seguir las instrucciones especificadas en la [wiki general](https://git.etsit.upm.es/grupointegraciondigital/wiki/-/wikis/Docker#container-registry-gitlab)


### Desarrollo: localhost

En localhost **no existe** la autenticación a través del servidor CAS, por esa razón hay que especificar el usuario que se desea utilizar: `USER_DEV` y `USER_DEV_ROLS`

#### Variables de entorno (DEV=true, PRUEBAS=false, DOCKER=false)
Son necesariuos **tres** archivos para configurar el entorno

`.env`

En `progDoc/file.env` se define el modelo a seguir para configurar el `.env` (incluído en el `.gitignore` para así no exponer datos sensibles)
```shell
POSTGRES_DB=programacion_docente
POSTGRESSESION_DB=progdocsession
DB_USERNAME=progdoc_user
DB_PASSWORD=1234
DBSESSION_USERNAME=progdoc_user
DB_HOST=localhost
DBSESSION_PASSWORD=1234
SESSION_SECRET=Secreto_para_las_sesiones
PATH_PDF=/storage/progdoc/
CONTEXT=/pdi/progdoc/
PORT=3000
DEV=true
PRUEBAS=false
DOCKER=false
USER_DEV=javier.conde.diaz@alumnos.upm.es
USER_DEV_ROLS=FA #employee type
DEBUG=
```
En desarrollo no se utiliza **DOCKER** para la aplicación WEB. Es necesario tener una base de datos **POSTGRESQL** instalada en el entorno o puede usarse un contenedor DOCKER para las bases de datos **exportando** el puerto 5432

#### Ejecución
Una vez configuradas las variables de entorno y el puerto correctamente, para desplegar la aplicación, hay que ir al directorio `progDoc`, y desde ahí ejecutar los siguientes comandos:


```
# Arrancar las bases de datos ya sea en un contenedor o en el propio host. Es necesario crear las bases de datos y los usuarios de las bbdd. No es necesario crear las tablas de las bases de datos. Al arrancar la aplicación se crean solas. 

# Instalar paquetes necearios 
npm install 

# Arrancar la aplicación web
npm start

```
Conectarse en http://localhost:3000/pdi/progdoc/

## Estilo del código
El proyecto está configurado para utilizar la guía de estilos de `airbnb` usando `eslint`. Existen dos scripts para comprobar la sintaxis y el estilo del código en el `package.json`
```shell
#eslint ./
npm run lint

#eslint ./ --fix
npm run lint:fix
```


## Enlaces relevantes
[Contenedor postgres](https://hub.docker.com/_/postgres/)

[Problemas con variables de entorno en el contenedor postgres](https://github.com/docker-library/postgres/issues/203)

[Api UPM](https://www.upm.es/apiupm/index.html)

[Wiki general](https://git.etsit.upm.es/grupointegraciondigital/wiki/-/wikis/home)

