class Viewer {

    constructor() {
        this.video;
        this.sphere;
        this.seeking = false;
        this.lastKeyCode;
    }

    start() {
        var stats;
        var that = this;

        var width = window.innerWidth;
        var height = window.innerHeight;

        var button;

        // シーンの作成
        var scene = new THREE.Scene();

        // 動画を貼り付ける球体のジオメトリを作成
        var geometry = new THREE.SphereGeometry(5, 60, 40);
        geometry.scale(- 1, 1, 1);

        // hexコードff00ffの色をもち、ワイヤーフレームを有効にしたマテリアルの生成
        // BasicMaterialは光源を必要としない
        var material = new THREE.MeshBasicMaterial({
            color: 0xAAAAAA,
            wireframe: true
        });

        // 球体メッシュを作成してシーンに追加
        var sphere = new THREE.Mesh(geometry, material);
        this.sphere = sphere;
        scene.add(sphere);

        //　カメラを作成
        var camera = new THREE.PerspectiveCamera(75, width / height, 1, 1000);
        camera.position.set(0, 0, 0.1);
        camera.lookAt(sphere.position);

        // レンダラーを作成してシーン・カメラを追加
        var renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true
        });
        renderer.setSize(width, height);
        renderer.setClearColor(0xffffff, 0);
        document.getElementById('stage').appendChild(renderer.domElement);
        renderer.render(scene, camera);

        // オービットコントロールを作成
        var controls = new THREE.OrbitControls(camera, renderer.domElement);

        // set stats
        // 左上に表示するようCSSを記述してbody直下に表示
        stats = new Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.top = '0';
        stats.domElement.style.zIndex = 100;
        document.body.appendChild(stats.domElement);

        // イベント設定
        setEvents();

        // レンダリング
        render();

        function setEvents() {

            document.getElementById('play').onclick = vidplay;
            document.getElementById('speed_1').onclick = function () { video.playbackRate = 1.0; };
            document.getElementById('speed_2').onclick = function () { video.playbackRate = 2.0; };
            document.getElementById('speed_3').onclick = function () { video.playbackRate = -1.0; };

            // ウィンドウがリサイズされたらレンダラのリサイズを行う   
            window.addEventListener('resize', onWindowResize, false);

            window.onkeydown = function (e) {
                if (!e) e = window.event; // レガシー
                if (that.seeking || !that.video) return;

                that.lastKeyCode = e.keyCode;
                var video = that.video;

                switch (that.lastKeyCode) {
                    case 49:
                        if (video.currentTime < video.duration) {
                            video.currentTime += 0.1;
                        } else {
                            // 次のノードへ
                        }
                        break;
                    case 50:
                        if (video.currentTime > 0) {
                            video.currentTime -= 0.1;
                        } else {
                            // 前のノードへ
                        }
                        break;
                    default:
                        break;
                }
                debug();
            };
        }


        function render() {
            // フレームが更新されたら再レンダリング
            requestAnimationFrame(render);

            // レンダリング
            renderer.render(scene, camera);

            // オービットコントロールの更新
            controls.update();

            // FPS計測        
            stats.update();

            debug();
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function vidplay() {
            if (video.paused) {
                video.play();
            } else {
                video.pause();
            }
        }

        function debug() {
            //document.getElementById('currentTime').innerText = video.currentTime;
            //document.getElementById('duration').innerText = video.duration;
        }
    }

    updateMaterial(obj) {

        var url = obj.url;
        var type = obj.type;

        var that = this;
        var sphere = this.sphere;
        var material = sphere.material;
        material.wireframe = false;

        if (type === 'node') {
            // node(静止画)
            material.map = THREE.ImageUtils.loadTexture(url);
            material.needsUpdate = true;

        } else {
            // line(動画)

            // 球体の内側に貼り付ける動画プレイヤーを作成
            var video;
            if (this.video) {
                video = this.video;
            } else {
                video = document.createElement('video');
                video.width = 640;
                video.height = 360;
                video.autoplay = true;
                video.playbackRate = 3.0;

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

                video.loop = false;
                this.video = video;
            }
            video.src = url;

            // 動画プレイヤーをテクスチャとするマテリアルを作成
            var texture = new THREE.VideoTexture(video);
            texture.minFilter = THREE.LinearFilter;
            material.map = texture;
            material.needsUpdate = true;
        }
    }
}