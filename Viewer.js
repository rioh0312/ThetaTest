class Viewer {

    constructor(viewmode) {
        this.video;
        this.scene;
        this.camera;
        this.sphere;
        this.effect;
        this.prevLineId;
        this.prevNodeId;
        this.selectObjects = [];
        this.eventItems = [];
        this.selected;
        this.projector = new THREE.Projector();
        this.raycaster = new THREE.Raycaster();
        this.mode;
        this.itemView;
        this.canplay;
        this.controls;
        this.doIntersect = false;

        this.LIMIT = 100;
        this.VIEW_MODE_ZERO = "0";
        this.VIEW_MODE_ONE = "1";
        this.viewmode = viewmode;
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
        var container = document.getElementById('world');
        container.appendChild(element);

        // create stereo effect
        if (this.viewmode === this.VIEW_MODE_ONE) {
            var effect = new THREE.StereoEffect(renderer);
        }

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
        scene.add(camera);

        // create controls
        var controls = new THREE.OrbitControls(camera);
        controls.enableZoom = true;
        controls.enablePan = true;
        controls.center.set(0, 0, 0);
        this.controls = controls;
        camera.position.copy(controls.center).add(new THREE.Vector3(1, 0, 0));
        //controls.target = new THREE.Vector3(0, 0, 0);

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

        // set cursor
        var cursor = new THREE.Vector2(0, 0);

        var cover;
        new THREE.TextureLoader().load('cover.png', function (map) {
            cover = new THREE.Mesh(
                new THREE.CircleGeometry(3, 32),
                new THREE.MeshBasicMaterial({
                    map: map,
                    transparent: true,
                    side: THREE.DoubleSide
                }));
            cover.type = 'skip';
            cover.position.set(0, -4, 0)
            cover.rotation.x = Math.PI / -2;
            scene.add(cover);
        })

        animate();

        function resize() {
            var width = container.offsetWidth;
            var height = container.offsetHeight;

            camera.aspect = width / height;
            camera.updateProjectionMatrix();

            if (that.viewmode === that.VIEW_MODE_ONE) {
                effect.setSize(width, height);
            } else {
                renderer.setSize(width, height);
            }
        }

        function update(dt) {
            resize();
            camera.updateProjectionMatrix();
            controls.update(dt);

            checkIntersects();
        }

        function checkIntersects() {
            var selectObjects = that.selectObjects;
            var eventItems = that.eventItems;
            var projector = that.projector;
            var camera = that.camera;
            var raycaster = that.raycaster;
            var scene = that.scene;

            var intersectables = [];
            for (var i = 0; i < selectObjects.length; i++) {
                var mesh = selectObjects[i];
                mesh.rotation.setFromRotationMatrix(camera.matrix);
                intersectables.push(mesh);
            }
            for (var i = 0; i < eventItems.length; i++) {
                var mesh = eventItems[i];
                mesh.rotation.setFromRotationMatrix(camera.matrix);
                intersectables.push(mesh);

                var currentTime = that.video.currentTime;
                if (mesh.start <= currentTime) {
                    mesh.visible = true;
                }
                if (mesh.end <= currentTime) {
                    mesh.visible = false;
                }
            }
            if (that.itemView) {
                that.itemView.rotation.setFromRotationMatrix(camera.matrix);
            }
            if (cover) {
                intersectables.push(cover);
            }

            /*
            var gaze = new THREE.Vector3(0, 0, 1);
            gaze.unproject(camera);
            raycaster.set(
                camera.position,
                gaze.sub(camera.position).normalize()
            );
            var intersects = raycaster.intersectObjects(intersectables);
            */

            // ポイントが乗っているオブジェクトを取得
            raycaster.setFromCamera(cursor, camera);
            var intersects = raycaster.intersectObjects(intersectables);

            // reset
            intersectables.forEach(function (i) {
                i.scale.set(2, 2, 2);
                //i.material.wireframe = true;
                i.material.needsUpdate = true;
            });

            // if found
            if (intersects.length > 0) {
                var found = intersects[0];
                // highlight
                found.object.scale.set(3.0, 3.0, 3.0);
                //found.object.material.wireframe = false;
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
                            if (that.doIntersect) {
                                that.doIntersect = false;

                                Viewer.writeLog('select root');
                                if (found.object.type === 'event') {
                                    if (!that.itemView) {
                                        that.video.pause();

                                        var loader = new THREE.TextureLoader();
                                        loader.load(mesh.viewfile, function (map) {
                                            var material = new THREE.MeshBasicMaterial({ map: map, transparent: true, depthTest: false });
                                            var geometry = new THREE.PlaneGeometry(7, 5, 0, 0);
                                            var mesh = new THREE.Mesh(geometry, material);
                                            mesh.position.x = found.object.position.x;
                                            mesh.position.z = found.object.position.z;
                                            mesh.type = 'event';
                                            material.needsUpdate = true;
                                            scene.add(mesh);

                                            that.itemView = mesh;
                                        });
                                    }
                                } else if (found.object.type === 'skip' && that.mode === 'line') {
                                    that.video.pause();
                                    that.video.currentTime = that.video.duration;
                                } else {
                                    $.ajax({
                                        type: "POST",
                                        url: "http://www.snowwhite.hokkaido.jp/manavimk2/road/send",
                                        data: {
                                            "id": found.object.lineId
                                        },
                                        dataType: "json",
                                        beforeSend: function (xhr) {
                                            //if (window.navigator.userAgent.toLowerCase().indexOf('safari') != -1)
                                            xhr.setRequestHeader("If-Modified-Since", new Date().toUTCString());
                                        },
                                        success: function (response) {
                                            that.updateMaterial(response);
                                        },
                                        error: function (XMLHttpRequest, textStatus, errorThrown) {
                                            Viewer.writeLog(errorThrown);
                                        }
                                    });
                                }
                            }
                        } else {
                            Viewer.writeLog('limit: ' + that.selected.limit);
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

            if (that.itemView && !that.selected) {
                var mesh = that.itemView;
                scene.remove(mesh);
                geometry.dispose();
                material.dispose();
                that.video.play();
                that.itemView = undefined;
                that.doIntersect = true;
            }
        }

        function render(dt) {
            if (that.viewmode === that.VIEW_MODE_ONE) {
                effect.render(scene, camera);
            } else {
                renderer.render(scene, camera);
            }
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
        var controls = this.controls;
        var camera = this.camera;
        var selectObjects = this.selectObjects;
        var eventItems = this.eventItems;
        this.prevLineId = '';
        this.mode = "node";

        sphere.material.wireframe = false;
        var url = obj.url;

        // remove event items
        for (var i = 0; i < eventItems.length; i++) {
            var item = eventItems[i];
            var mesh = item;
            var geometry = mesh.geometry;
            var material = mesh.material;
            scene.remove(mesh);
            geometry.dispose();
            material.dispose();
        }
        this.eventItems = [];

        // create select objects
        for (var i = 0; i < obj.lines.length; i++) {
            var line = obj.lines[i];

            var color = 0x00ff00;
            var isPrev = false;
            if (line.id === this.prevLineId) {
                isPrev = true;
                color = 0xff0000;
            }
            //new THREE.TextureLoader().load(line.image, function (map) {
            var material = new THREE.MeshBasicMaterial({ map: THREE.ImageUtils.loadTexture(line.image), transparent: true }); // old version
            var geometry = new THREE.PlaneGeometry(0.5, 0.5, 0, 0);
            var mesh = new THREE.Mesh(geometry, material);

            var radius = 4;
            var rad = line.degree * Math.PI / 180;
            var x = radius * Math.cos(rad);
            var z = radius * Math.sin(rad);

            mesh.position.x = x;
            mesh.position.z = z;
            mesh.lineId = line.id;
            mesh.type = 'selector';
            scene.add(mesh);

            selectObjects.push(mesh);
            //});
        }

        Viewer.writeLog('start node texture loading');
        new THREE.TextureLoader().load(url, function (map) {
            sphere.material.map = map;
            sphere.material.needsUpdate = true;
            Viewer.writeLog('loaded node texture');
        });

        // カメラを正面に向ける
        controls.center.set(0, 0, 0);
        camera.position.copy(controls.center).add(new THREE.Vector3(1, 0, 0));

        that.LIMIT = 50;
        that.doIntersect = true;
    }

    setLineMode(obj) {
        console.log(new Date().getTime());
        var that = this;
        var sphere = this.sphere;
        var scene = this.scene;
        var controls = this.controls;
        var camera = this.camera;
        var selectObjects = this.selectObjects;
        var eventItems = this.eventItems;
        this.mode = "line";
        this.obj = obj;
        sphere.material.wireframe = false;

        // remove select objects
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

        // create event items
        for (var i = 0; i < obj.items.length; i++) {
            var item = obj.items[i];
            var loader = new THREE.TextureLoader();
            loader.load(item.file, function (map) {
                var material = new THREE.MeshBasicMaterial({ map: map, transparent: true });
                var geometry = new THREE.PlaneGeometry(0.5, 0.5, 0, 0);
                var mesh = new THREE.Mesh(geometry, material);
                mesh.position.x = -3;
                mesh.position.z = -3;
                mesh.type = 'event';
                mesh.viewfile = item.viewfile;
                mesh.visible = false;
                mesh.start = Number(item.start);
                mesh.end = Number(item.end);
                material.needsUpdate = true;

                scene.add(mesh);
                eventItems.push(mesh);
            });
        }


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
            video.play();

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
                if (that.video.paused) {
                    that.video.play();
                }
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
                    url: "http://www.snowwhite.hokkaido.jp/manavimk2/node/send",
                    data: {
                        id: that.obj.next_node_id
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
            video.play();

            // 動画プレイヤーをテクスチャとするマテリアルを作成
            var texture = new THREE.VideoTexture(video);
            texture.minFilter = THREE.LinearFilter;
            sphere.material.map = texture;
            sphere.material.needsUpdate = true;
        }

        // カメラを正面に向ける
        controls.center.set(0, 0, 0);
        camera.position.copy(controls.center).add(new THREE.Vector3(1, 0, 0));

        that.LIMIT = 10;
        that.doIntersect = true;
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