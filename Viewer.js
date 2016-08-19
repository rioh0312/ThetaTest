class Viewer {

    constructor() {
        this.video;
        this.scene;
        this.sphere;
        this.effect;
        this.seeking = false;
        this.lastKeyCode;
        this.prevLineId;
        this.prevNodeId;
    }

    start() {

        var clock = new THREE.Clock();

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
        camera.position.set(0, 0, 0.1);
        camera.lookAt(sphere.position);
        scene.add(camera);

        // create controls
        var controls = new THREE.OrbitControls(camera, element);
        //controls.noZoom = true;
        controls.noPan = true;

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
            resize();

            camera.updateProjectionMatrix();

            controls.update(dt);
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
        sphere.material.wireframe = false;
        var url = obj.url;
        this.prevLineId = "1234"; //debug

        /*
        for (var i = 0; i < obj.lines.length; i++) {
            var line = obj.lines[i];

            var color = 0x00ff00;
            var isPrev = false;
            if (line.id === this.prevLineId) {
                isPrev = true;
                color = 0xff0000;
            }

            var radius = 3;
            var rad = line.degree * Math.PI / 180;
            var x = radius * Math.cos(rad);
            var z = radius * Math.sin(rad);

            var material = new THREE.MeshBasicMaterial({ color: color });
            var geometry = new THREE.SphereGeometry(0.1, 5, 5)
            var mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(x, 0, z);
            scene.add(mesh);
        }
        */

        sphere.material.map = THREE.ImageUtils.loadTexture(url);
        sphere.material.needsUpdate = true;

        document.getElementById('next').addEventListener('click', function () {
            $.ajax({
                type: "POST",
                url: "line.json",
                dataType: "json",
                success: function (response) {
                    that.updateMaterial(response);
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                }
            });
        });
    }

    setLineMode(obj) {
        var that = this;
        var sphere = this.sphere;
        var scene = this.scene;
        sphere.material.wireframe = false;

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
            video.addEventListener('canplaythrough', function () {
                video.play();
            });

        } else {
            video = document.createElement('video');
            this.video = video;

            video.width = 640;
            video.height = 360;
            video.muted = true;
            video.autoplay = true;
            video.playbackRate = 3.0;
            video.loop = false;
            video.src = url;

            var seekingStartTime;
            video.onseeking = function () {
                seeking = true;
                seekingStartTime = new Date().getTime();
                console.log("seeking:" + lastKeyCode);
            }
            video.onseeked = function () {
                seeking = false;
                console.log("seeked:" + (new Date().getTime() - seekingStartTime) + "ms");
            }
            video.onended = function () {
                video.pause();
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
            window.makeVideoPlayableInline(video, /* mute necessary for autoplay*/ false);
            video.pause();

            // 動画プレイヤーをテクスチャとするマテリアルを作成
            var texture = new THREE.VideoTexture(video);
            texture.minFilter = THREE.LinearFilter;
            sphere.material.map = texture;
            sphere.material.needsUpdate = true;
            video.addEventListener('canplaythrough', function () {
                console.log('complete');
            });

            document.getElementById('play').addEventListener('click', function () {
                video.play();
            }, false);
        }
    }
}