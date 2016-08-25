class Viewer {

    constructor() {
        this.video;
        this.scene;
        this.camera;
        this.sphere;
        this.effect;
        this.prevLineId;
        this.prevNodeId;
        this.selectObjects = [];
        this.selected;
        this.projector = new THREE.Projector();
        this.raycaster = new THREE.Raycaster();
        this.mode;
        this.canplay;

        this.LIMIT = 200;
    }

    start() {

        var clock = new THREE.Clock();
        var that = this;

        // create renderer
        var renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true
        });
        var element = renderer.domElement;
        var container = document.getElementById('stage');
        container.appendChild(element);

        // create effect
        var effect = new THREE.StereoEffect(renderer);

        // create scene
        var scene = new THREE.Scene();
        this.scene = scene;

        // create sphere
        var geometry = new THREE.SphereGeometry(5, 60, 40);
        geometry.scale(- 1, 1, 1);
        var material = new THREE.MeshBasicMaterial({
            color: 0xAAAAAA,
            wireframe: true
        });
        var sphere = new THREE.Mesh(geometry, material);
        this.sphere = sphere;
        scene.add(sphere);

        // create/add camera
        var camera = new THREE.PerspectiveCamera(90, 1, 0.001, 700);
        this.camera = camera;
        camera.position.set(0, 0, 0.1);
        camera.lookAt(sphere.position);
        scene.add(camera);

        // create controls
        var controls = new THREE.OrbitControls(camera, element);
        //controls.noZoom = true;
        controls.enablePan = true;

        function setOrientationControls(e) {
            if (!e.alpha) {
                return;
            }

            controls = new THREE.DeviceOrientationControls(camera, true);
            controls.connect();
            controls.update();

            element.addEventListener('click', fullscreen, false);

            window.removeEventListener('deviceorientation', setOrientationControls, true);
        }
        window.addEventListener('deviceorientation', setOrientationControls, true);

        // add resize event
        window.addEventListener('resize', resize, false);
        setTimeout(resize, 1);

        // set stats
        var stats = new Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.top = '0';
        stats.domElement.style.zIndex = 100;
        document.body.appendChild(stats.domElement);

        /*
        var helper = new THREE.AxisHelper(1000);
        scene.add(helper);
        var ground = new THREE.Mesh(
            new THREE.PlaneGeometry(10, 10, 10, 10),
            new THREE.MeshBasicMaterial({
                color: 0xFFFFFF,
                wireframe: true
            })
        );
        ground.rotation.x = Math.PI / -2;
        scene.add(ground);
        */

        animate();

        function resize() {
            var width = container.offsetWidth;
            var height = container.offsetHeight;

            camera.aspect = width / height;
            camera.updateProjectionMatrix();

            renderer.setSize(width, height);
            effect.setSize(width, height);
        }

        function update(dt) {
            var selectObjects = that.selectObjects;
            var projector = that.projector;
            var camera = that.camera;
            var raycaster = that.raycaster;
            var scene = that.scene;
            resize();

            camera.updateProjectionMatrix();
            controls.update(dt);

            if (that.mode === "node") {
                var intersectables = [];
                for (var i = 0; i < selectObjects.length; i++) {
                    var mesh = selectObjects[i];
                    mesh.rotation.setFromRotationMatrix(camera.matrix);
                    intersectables.push(mesh);
                }

                var gaze = new THREE.Vector3(0, 0, 1);
                gaze.unproject(camera);
                raycaster.set(
                    camera.position,
                    gaze.sub(camera.position).normalize()
                );
                var intersects = raycaster.intersectObjects(intersectables);

                // reset
                intersectables.forEach(function (i) {
                    i.scale.set(1, 1, 1);
                    i.material.wireframe = true;
                    i.material.needsUpdate = true;
                });

                // if found
                if (intersects.length > 0) {
                    var found = intersects[0];
                    // highlight
                    found.object.scale.set(1.2, 1.2, 1.2);
                    found.object.material.wireframe = false;
                    found.object.material.needsUpdate = true;

                    if (!that.selected) {
                        that.selected = {
                            id: found.object.uuid,
                            limit: that.LIMIT,
                            obj: found.object
                        };
                    } else {
                        if (that.selected.id === found.object.uuid) {

                            that.selected.limit -= 1;
                            if (that.selected.limit <= 0) {

                                // todo:lineidで探すべき
                                Viewer.writeLog('select root');
                                $.ajax({
                                    type: "POST",
                                    url: "line.json",
                                    dataType: "json",
                                    beforeSend: function (xhr) {
                                        //if (window.navigator.userAgent.toLowerCase().indexOf('safari') != -1)
                                        xhr.setRequestHeader("If-Modified-Since", new Date().toUTCString());
                                    },
                                    success: function (response) {
                                        viewer.updateMaterial(response);
                                    },
                                    error: function (XMLHttpRequest, textStatus, errorThrown) {
                                        Viewer.writeLog(errorThrown);
                                    }
                                });
                            }
                        } else {
                            that.selected = {
                                id: found.object.uuid,
                                limit: that.LIMIT,
                                obj: found.object
                            };
                        }
                    }
                } else {
                    that.selected = undefined;
                }
            } else {
                that.selected = undefined;
            }
        }

        function render(dt) {
            effect.render(scene, camera);
            stats.update();
        }

        function animate(t) {
            requestAnimationFrame(animate);
            update(clock.getDelta());
            render(clock.getDelta());
        }

        function fullscreen() {
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.msRequestFullscreen) {
                container.msRequestFullscreen();
            } else if (container.mozRequestFullScreen) {
                container.mozRequestFullScreen();
            } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
            }
        }
    }

    updateMaterial(obj) {

        var type = obj.type;
        if (type === 'node') {
            // node(静止画)
            this.setNodeMode(obj);
        } else {
            // line(動画)
            this.setLineMode(obj);
        }
    }

    setNodeMode(obj) {
        var that = this;
        var sphere = this.sphere;
        var scene = this.scene;
        var camera = this.camera;
        this.mode = "node";
        var selectObjects = this.selectObjects;
        sphere.material.wireframe = false;
        var url = obj.url;
        this.prevLineId = "1234"; //debug

        for (var i = 0; i < obj.lines.length; i++) {
            var line = obj.lines[i];

            var color = 0x00ff00;
            var isPrev = false;
            if (line.id === this.prevLineId) {
                isPrev = true;
                color = 0xff0000;
            }

            var radius = 4;
            var rad = line.degree * Math.PI / 180;
            var x = radius * Math.cos(rad);
            var z = radius * Math.sin(rad);

            var material = new THREE.MeshBasicMaterial({ color: color, wireframe: true });
            var geometry = new THREE.PlaneGeometry(0.5, 0.5, 0, 0);
            var mesh1 = new THREE.Mesh(geometry, material);
            mesh1.position.x = x;
            mesh1.position.z = z;
            scene.add(mesh1);

            selectObjects.push(mesh1);
        }

        Viewer.writeLog('start node texture loading');
        var loader = new THREE.TextureLoader();
        loader.load(url, function (map) {
            sphere.material.map = map;
            sphere.material.needsUpdate = true;
            Viewer.writeLog('loaded node texture');
        });
    }

    setLineMode(obj) {
        var that = this;
        var sphere = this.sphere;
        var scene = this.scene;
        var selectObjects = this.selectObjects;
        this.mode = "line";
        sphere.material.wireframe = false;

        for (var i = 0; i < selectObjects.length; i++) {
            var selectObj = selectObjects[i];
            var mesh = selectObj;
            var geometry = mesh.geometry;
            var material = mesh.material;
            scene.remove(mesh);
            geometry.dispose();
            material.dispose();
        }
        this.selectObjects = [];


        var url = obj.url;
        this.prevLineId = obj.id;

        // 球体の内側に貼り付ける動画プレイヤーを作成
        var video;
        if (this.video) {
            video = this.video;
            video.src = url;

            // 動画プレイヤーをテクスチャとするマテリアルを作成
            var texture = new THREE.VideoTexture(video);
            texture.minFilter = THREE.LinearFilter;
            sphere.material.map = texture;
            sphere.material.needsUpdate = true;

            //video.pause();
            //video.addEventListener('canplaythrough', function () {
            video.play();
            //});

        } else {
            video = document.createElement('video');
            this.video = video;

            video.width = 640;
            video.height = 360;
            video.muted = true;
            video.autoplay = false;
            video.loop = false;
            video.src = url;

            video.onloadstart = function () {
                Viewer.writeLog('start movie loading');
            }
            video.onprogress = function () {
                Viewer.writeLog('now loading(network loading) ..');
            }
            video.onsuspend = function () {
                Viewer.writeLog('now loading(network idle) ..');
            }
            video.onloadedmetadata = function () {
                Viewer.writeLog('loaded metadata');
            }
            video.onstalled = function () {
                Viewer.writeLog('stalled');
            }
            video.onloadeddata = function () {
                Viewer.writeLog('loaded movie');
            }
            video.oncanplaythrough = function () {
                Viewer.writeLog('can play through');
                that.canplay = true;
            }
            video.onplay = function () {
                Viewer.writeLog('play');
                if (!that.canplay) {
                    Viewer.writeLog('yet can play through ..');
                    video.pause();
                    video.addEventListener('canplaythrough', function () {
                        that.canplay = true;
                        video.play();
                    });
                }
            }
            video.onpause = function () {
                Viewer.writeLog('pause');
            }
            video.onended = function () {
                Viewer.writeLog('ended');
                video.pause();
                that.canplay = false;

                $.ajax({
                    type: "POST",
                    url: "node.json", // TODO サーバーサイドでdataの内容に合わせたJSONを返却
                    data: {
                        id: obj.next_node_id
                    },
                    dataType: "json",
                    success: function (response) {
                        that.updateMaterial(response);
                    },
                    error: function (XMLHttpRequest, textStatus, errorThrown) {
                        alert(errorThrown);
                    }
                });

            }
            window.makeVideoPlayableInline(video, false);
            video.pause();

            // 動画プレイヤーをテクスチャとするマテリアルを作成
            var texture = new THREE.VideoTexture(video);
            texture.minFilter = THREE.LinearFilter;
            sphere.material.map = texture;
            sphere.material.needsUpdate = true;
            //video.addEventListener('canplaythrough', function () {
            //});
            document.getElementById('play').addEventListener('click', function () {
                video.play();
            }, false);
        }
    }

    static writeLog(msg) {
        if ($('#log-field').children().length >= 50) {
            $('#log-field').children()[0].remove();
        }
        var li = "<li>" + msg + "</li>";
        $('#log-field').append(li)
        $('#info').scrollTop($('#info')[0].scrollHeight);
    }
}