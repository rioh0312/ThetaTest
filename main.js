var viewer;
(function () {

    viewer = new Viewer();
    viewer.start();

    $.ajax({
        type: "POST",
        url: "line.json",
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
            url: "line.json",
            dataType: "json",
            success: function (response) {
                viewer.updateMaterial(response);
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
            }
        });
    });
})();