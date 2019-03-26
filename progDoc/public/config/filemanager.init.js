$('.fm-container').richFilemanager({
    // options for the plugin initialization step and callback functions, see:
    // https://github.com/servocoder/RichFilemanager/wiki/Configuration-options#plugin-parameters
    //con esta configuracion gestiono los permisos, actualmente solo de lectura y descarga
    baseUrl: '.',
    callbacks: {
        beforeSendRequest: function (requestMethod, requestParams) {
            let permisos = ["readfolder","initiate","download","readfile"]
            if (!permisos.includes(requestParams.mode))return false;
            return true;
        }
    }
});



