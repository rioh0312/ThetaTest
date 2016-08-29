var viewer;
(function () {

    var vars = {};
    var param = location.search.substring(1).split('&');
    for (var i = 0; i < param.length; i++) {
        var keySearch = param[i].search(/=/);
        var key = '';
        if (keySearch != -1) key = param[i].slice(0, keySearch);
        var val = param[i].slice(param[i].indexOf('=', 0) + 1);
        if (key != '') vars[key] = decodeURI(val);
    }

    var viewer = new Viewer(vars['viewmode']);
    viewer.start();

    $.ajax({
        type: "POST",
        url: "http://www.snowwhite.hokkaido.jp/manavimk2/node/send",
        dataType: "json",
        success: function (response) {
            viewer.updateMaterial(response);
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
        }
    });

    $('#next').on('click', function () {
        $.ajax({
            type: "POST",
            url: "http://www.snowwhite.hokkaido.jp/manavimk2/node/send",
            dataType: "json",
            success: function (response) {
                viewer.updateMaterial(response);
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
            }
        });
    });
})();