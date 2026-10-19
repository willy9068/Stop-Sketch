// 이미지 불러오기. 단일 파일 빌드는 G.EMBED(내장 이미지)를 먼저 보고, 개발본은 assets/ 폴더에서 읽는다.
// 이미지가 없거나 아직 안 불러졌으면 get()이 null → 화면은 색 블록으로 그린다.
// (개발본에서 없는 파일은 브라우저 콘솔에 404로 남지만 게임에는 영향 없음)
var G = G || {};

G.Assets = {
  img: {},

  load: function () {
    var self = this, art = G.DATA.art;
    art.images.forEach(function (name) {
      var src = G.EMBED && G.EMBED[name];
      if (!src) {
        if (G.SINGLE_FILE) return;               // 제출본은 외부 파일을 읽지 않는다
        src = art.dir + name + '.png';
      }
      var im = new Image();
      im.onload = function () { self.img[name] = im; };
      im.src = src;
    });
  },

  get: function (name) { return this.img[name] || null; }
};
