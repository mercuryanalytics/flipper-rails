(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['exports'], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports);
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports);
    global.flipper = mod.exports;
  }
})(this, function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = flipper;

  var _slicedToArray = function () {
    function sliceIterator(arr, i) {
      var _arr = [];
      var _n = true;
      var _d = false;
      var _e = undefined;

      try {
        for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);

          if (i && _arr.length === i) break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i["return"]) _i["return"]();
        } finally {
          if (_d) throw _e;
        }
      }

      return _arr;
    }

    return function (arr, i) {
      if (Array.isArray(arr)) {
        return arr;
      } else if (Symbol.iterator in Object(arr)) {
        return sliceIterator(arr, i);
      } else {
        throw new TypeError("Invalid attempt to destructure non-iterable instance");
      }
    };
  }();

  var CLICK_THRESHOLD = 250;

  function linear(min, max) {
    return function (x) {
      return min + x * (max - min);
    };
  }

  function iterate(o, fn) {
    return Object.keys(o).forEach(function (k) {
      return fn(k, o[k]);
    });
  }

  function shapeSelector(kit, shape) {
    switch (shape) {
      case 'circle':
        return kit.circle;

      default:
        return kit.rectangle;
    }
  }

  function computeEmbedSize(image, scale) {
    if (scale === null || scale === undefined || scale <= 0) return [image.naturalWidth, image.naturalHeight];
    var availableWidth = scale * (screen.width - Math.max(window.outerWidth - window.innerWidth, 0));
    var availableHeight = scale * (screen.width - Math.max(window.outerHeight - window.innerHeight, 0));

    if ('orientation' in window && (window.orientation / 90 & 1) == 1) {
      ;
      var _ref = [availableHeight, availableWidth];
      availableWidth = _ref[0];
      availableHeight = _ref[1];
    }

    var aspect = 2 * image.naturalWidth / image.naturalHeight;
    var height = Math.floor(availableHeight);
    var width = Math.floor(height * aspect);

    if (width > availableWidth) {
      width = availableWidth;
      height = Math.floor(width / aspect);
    }

    return [width / 2, height];
  }

  function animate(renderFrame, duration) {
    return new Promise(function (resolve) {
      var start = undefined;

      var tick = function tick(now) {
        var time = Math.min((now - start) / duration, 1);
        renderFrame(time);

        if (time < 1) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      };

      return requestAnimationFrame(function (now) {
        return tick(start = now);
      });
    });
  }

  function createRenderer(width, height, canvas, dataset) {
    var w = width;
    var h = height;
    var h2 = h / 2;
    var topMargin = Math.hypot(w, h) - h;
    var bottomMargin = topMargin / 4;
    canvas.width = 2 * w;
    canvas.height = topMargin + bottomMargin + h;
    canvas.style.marginTop = -topMargin + "px";
    canvas.style.marginBottom = -bottomMargin + "px";
    canvas.style.marginLeft = 0;
    canvas.style.marginRight = 0;
    canvas.style.padding = 0;

    function isTouchEvent(event) {
      return event.type && event.type.substr(0, 5) === "touch";
    }

    function toLocalCoordinates(mouse) {
      var timeStamp = mouse.timeStamp;
      if (isTouchEvent(mouse)) mouse = mouse.changedTouches[0];
      var x = mouse.clientX;
      var y = mouse.clientY;

      var _canvas$getBoundingCl = canvas.getBoundingClientRect();

      var left = _canvas$getBoundingCl.left;
      var top = _canvas$getBoundingCl.top;
      return {
        x: x - left - w,
        y: y - top - h2 - topMargin,
        timeStamp: timeStamp
      };
    }

    var topLeft = {
      x: -w,
      y: -h2,
      direction: -1,
      backX: -w,
      transform: function transform(x, y, x1, y1, x2, y2) {
        return {
          x: x,
          y: y,
          tx: function tx(ctx) {
            ctx.translate(x1, -h2);
            ctx.rotate(Math.atan2(y + h2, x - x1));
            ctx.translate(Math.hypot(x - x1, y + h2), h2);
          },
          rx: function rx(ctx) {
            ctx.translate(-Math.hypot(x - x1, y + h2), -h2);
            ctx.rotate(-Math.atan2(y + h2, x - x1));
            ctx.translate(-x1, h2);
          },
          leaf: -w > y1 ? function (ctx) {
            ctx.moveTo(0, x2);
            ctx.lineTo(-Math.hypot(x - x1, y + h2), -h2);
            ctx.lineTo(0, -h2);
          } : function (ctx) {
            ctx.moveTo(-w - y1, h2);
            ctx.lineTo(-Math.hypot(x - x1, y + h2), -h2);
            ctx.lineTo(0, -h2), ctx.lineTo(0, h2);
          },
          back: -w > y1 ? function (ctx) {
            ctx.moveTo(-w, -h2);
            ctx.lineTo(x1, -h2);
            ctx.lineTo(-w, x2);
          } : function (ctx) {
            ctx.moveTo(-w, -h2);
            ctx.lineTo(x1, -h2);
            ctx.lineTo(y1, h2);
            ctx.lineTo(-w, h2);
          },
          page: -w > y1 ? function (ctx) {
            ctx.moveTo(x1, -h2);
            ctx.lineTo(-w, x2);
            ctx.lineTo(-w, h2);
            ctx.lineTo(w, h2);
            ctx.lineTo(w, -h2);
          } : function (ctx) {
            ctx.moveTo(w, -h2);
            ctx.lineTo(x1, -h2);
            ctx.lineTo(y1, h2);
            ctx.lineTo(w, h2);
          }
        };
      }
    };
    var bottomLeft = {
      x: -w,
      y: h2,
      direction: -1,
      backX: -w,
      transform: function transform(x, y, x1, y1, x2, y2) {
        return {
          x: x,
          y: y,
          tx: function tx(ctx) {
            ctx.translate(y1, h2);
            ctx.rotate(Math.atan2(y - h2, x - y1));
            ctx.translate(Math.hypot(y - h2, x - y1), -h2);
          },
          rx: function rx(ctx) {
            ctx.translate(-Math.hypot(y - h2, x - y1), h2);
            ctx.rotate(-Math.atan2(y - h2, x - y1));
            ctx.translate(-y1, -h2);
          },
          leaf: -w > x1 ? function (ctx) {
            ctx.moveTo(-Math.hypot(x - y1, y - h2), h2);
            ctx.lineTo(0, x2);
            ctx.lineTo(0, h2);
          } : function (ctx) {
            ctx.moveTo(-Math.hypot(x - y1, y - h2), h2);
            ctx.lineTo(-w - x1, -h2);
            ctx.lineTo(0, -h2);
            ctx.lineTo(0, h2);
          },
          back: -w > x1 ? function (ctx) {
            ctx.moveTo(-w, h2);
            ctx.lineTo(y1, h2);
            ctx.lineTo(-w, x2);
          } : function (ctx) {
            ctx.moveTo(-w, -h2);
            ctx.lineTo(x1, -h2);
            ctx.lineTo(y1, h2);
            ctx.lineTo(-w, h2);
          },
          page: -w > x1 ? function (ctx) {
            ctx.moveTo(y1, h2);
            ctx.lineTo(-w, x2);
            ctx.lineTo(-w, -h2);
            ctx.lineTo(w, -h2);
            ctx.lineTo(w, h2);
          } : function (ctx) {
            ctx.moveTo(w, -h2);
            ctx.lineTo(x1, -h2);
            ctx.lineTo(y1, h2);
            ctx.lineTo(w, h2);
          }
        };
      }
    };
    var topRight = {
      x: w,
      y: -h2,
      direction: 1,
      backX: 0,
      transform: function transform(x, y, x1, y1, x2, y2) {
        return {
          x: x,
          y: y,
          tx: function tx(ctx) {
            ctx.translate(x1, -h2);
            ctx.rotate(Math.atan2(y + h2, x - x1) - Math.PI);
            ctx.translate(w - Math.hypot(y + h2, x - x1), h2);
          },
          rx: function rx(ctx) {
            ctx.translate(Math.hypot(y + h2, x - x1) - w, -h2);
            ctx.rotate(-Math.atan2(y + h2, x - x1) - Math.PI);
            ctx.translate(-x1, h2);
          },
          leaf: y1 > w ? function (ctx) {
            ctx.moveTo(Math.hypot(x - x1, y + h2) - w, -h2);
            ctx.lineTo(-w, y2);
            ctx.lineTo(-w, -h2);
          } : function (ctx) {
            ctx.moveTo(Math.hypot(x - x1, y + h2) - w, -h2);
            ctx.lineTo(-y1, h2);
            ctx.lineTo(-w, h2);
            ctx.lineTo(-w, -h2);
          },
          back: y1 > w ? function (ctx) {
            ctx.moveTo(w, -h2);
            ctx.lineTo(x1, -h2);
            ctx.lineTo(w, y2);
          } : function (ctx) {
            ctx.moveTo(w, -h2);
            ctx.lineTo(x1, -h2);
            ctx.lineTo(y1, h2);
            ctx.lineTo(w, h2);
          },
          page: y1 > w ? function (ctx) {
            ctx.moveTo(x1, -h2);
            ctx.lineTo(w, y2);
            ctx.lineTo(w, h2);
            ctx.lineTo(-w, h2);
            ctx.lineTo(-w, -h2);
          } : function (ctx) {
            ctx.moveTo(-w, -h2);
            ctx.lineTo(x1, -h2);
            ctx.lineTo(y1, h2);
            ctx.lineTo(-w, h2);
          }
        };
      }
    };
    var bottomRight = {
      x: w,
      y: h2,
      direction: 1,
      backX: 0,
      transform: function transform(x, y, x1, y1, x2, y2) {
        return {
          x: x,
          y: y,
          tx: function tx(ctx) {
            ctx.translate(y1, h2);
            ctx.rotate(Math.atan2(y - h2, x - y1) - Math.PI);
            ctx.translate(w - Math.hypot(y - h2, x - y1), -h2);
          },
          rx: function rx(ctx) {
            ctx.translate(Math.hypot(y - h2, x - y1) - w, h2);
            ctx.rotate(-Math.atan2(y - h2, x - y1) - Math.PI);
            ctx.translate(-y1, -h2);
          },
          leaf: x1 > w ? function (ctx) {
            ctx.moveTo(-w, y2);
            ctx.lineTo(Math.hypot(x - y1, y - h2) - w, h2);
            ctx.lineTo(-w, h2);
          } : function (ctx) {
            ctx.moveTo(-x1, -h2);
            ctx.lineTo(Math.hypot(x - y1, y - h2) - w, h2);
            ctx.lineTo(-w, h2);
            ctx.lineTo(-w, -h2);
          },
          back: x1 > w ? function (ctx) {
            ctx.moveTo(w, h2);
            ctx.lineTo(y1, h2);
            ctx.lineTo(w, y2);
          } : function (ctx) {
            ctx.moveTo(w, -h2);
            ctx.lineTo(x1, -h2);
            ctx.lineTo(y1, h2);
            ctx.lineTo(w, h2);
          },
          page: x1 > w ? function (ctx) {
            ctx.moveTo(y1, h2);
            ctx.lineTo(w, y2);
            ctx.lineTo(w, -h2);
            ctx.lineTo(-w, -h2);
            ctx.lineTo(-w, h2);
          } : function (ctx) {
            ctx.moveTo(-w, -h2);
            ctx.lineTo(x1, -h2);
            ctx.lineTo(y1, h2);
            ctx.lineTo(-w, h2);
          }
        };
      }
    };

    function nearestCorner(pt) {
      if (pt.x < 0) {
        if (pt.y < 0) return topLeft;else return bottomLeft;
      } else {
        if (pt.y < 0) return topRight;else return bottomRight;
      }
    }

    function oppositeCorner(pt) {
      if (pt.x < 0) {
        if (pt.y < 0) return topRight;else return bottomRight;
      } else {
        if (pt.y < 0) return topLeft;else return bottomLeft;
      }
    }

    function calculateLeafGeometry(x, y, corner) {
      var cx = corner.x;
      var cy = corner.y;

      if (Math.abs(x) > w) {
        var scale = w / Math.hypot(x, y - cy);
        x *= scale;
        y *= scale;
      }

      if (Math.abs(y) > h2 && y * cy > 0) {
        if (Math.abs(x) > w) {
          var _nearestCorner = nearestCorner({
            x: x,
            y: y
          });

          x = _nearestCorner.x;
          y = _nearestCorner.y;
        } else {
          var outerLimit = Math.hypot(w, h);
          var b = Math.hypot(x, y + cy);

          if (b > outerLimit) {
            var scale = outerLimit / b;
            x = scale * x;
            y = scale * (y + cy) - cy;
          }
        }
      } else {
        var outerLimit = w;
        var d = Math.hypot(x, y - cy);

        if (d > outerLimit) {
          var scale = outerLimit / d;
          x = scale * x;
          y = scale * (y - cy) + cy;
        }
      }

      var mx = (x - cx) / 2;
      var my = (y - cy) / 2;
      var g = mx;
      var t = -my;
      mx += cx;
      my += cy;
      return corner.transform(x, y, (-h2 - my) * t / g + mx, (h2 - my) * t / g + mx, (-w - mx) * g / t + my, (w - mx) * g / t + my);
    }

    function gradient(ctx, from, to, mid, strength) {
      if (strength == null) strength = .5;
      var fx = from.x;
      var fy = from.y;
      var tx = to.x;
      var ty = to.y;
      var result = ctx.createLinearGradient(fx, fy, fx + strength * (tx - fx), fy + strength * (ty - fy));
      result.addColorStop(0, 'rgba(0,0,0,' + mid.toFixed(4) + ')');
      result.addColorStop(1, "rgba(0,0,0,0)");
      return result;
    }

    var shapeRenderers = {
      circle: function circle(ctx, x0, coords) {
        var _coords = _slicedToArray(coords, 3);

        var x = _coords[0];
        var y = _coords[1];
        var r = _coords[2];
        ctx.arc(x0 + x, y - h2, r, 0, 2 * Math.PI, false);
      },
      rectangle: function rectangle(ctx, x0, coords) {
        var _coords2 = _slicedToArray(coords, 4);

        var x1 = _coords2[0];
        var y1 = _coords2[1];
        var x2 = _coords2[2];
        var y2 = _coords2[3];
        ctx.rect(x0 + x1, y1 - h2, x2 - x1, y2 - y1);
      }
    };

    function renderAreas(map, ctx, x) {
      function shapeStyle(s) {
        if (dataset.hover[s]) return "rgba(0,255,0,0.5)";
        if (dataset.selection[s]) return "rgba(255,0,0,0.5)";
        return "rgba(0,0,0,0.5)";
      }

      var renderer = function renderer(r) {
        return function (ctx, x, coords, style) {
          ctx.save();
          ctx.fillStyle = style;
          ctx.beginPath();
          r(ctx, x, coords);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        };
      };

      iterate(map, function (name, areas) {
        return areas.forEach(function (area) {
          return renderer(shapeSelector(shapeRenderers, area.shape))(ctx, x, area.coords, shapeStyle(name));
        });
      });
    }

    function renderOverleaf(ctx, corner, mouseX, mouseY, leftImage, rightImage, leftMap, rightMap) {
      var _calculateLeafGeometr = calculateLeafGeometry(mouseX, mouseY, corner);

      var x = _calculateLeafGeometr.x;
      var y = _calculateLeafGeometr.y;
      var tx = _calculateLeafGeometr.tx;
      var rx = _calculateLeafGeometr.rx;
      var leaf = _calculateLeafGeometr.leaf;
      var back = _calculateLeafGeometr.back;
      var page = _calculateLeafGeometr.page;
      var cx = corner.x;
      var cy = corner.y;
      var mx = cx + (x - cx) / 2;
      var my = cy + (y - cy) / 2;
      var reach = 1 - .95 * Math.hypot(mx - cx, my - cy) / w;
      ctx.save();
      page(ctx);
      ctx.clip();
      ctx.fillStyle = gradient(ctx, {
        x: mx,
        y: my
      }, {
        x: x,
        y: y
      }, reach, .3);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      back(ctx);
      ctx.closePath();
      ctx.clip();

      if (rightImage) {
        ctx.drawImage(rightImage, corner.backX, -h2, w, h);
        renderAreas(rightMap.map, ctx, corner.backX);
      } else {
        ctx.clearRect(corner.backX, -h2, w, h);
      }

      ctx.fillStyle = gradient(ctx, {
        x: mx,
        y: my
      }, corner, reach);
      ctx.fill();
      ctx.restore();
      ctx.save();
      tx(ctx);
      ctx.beginPath();
      leaf(ctx);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(leftImage, -w, -h2, w, h);
      renderAreas(leftMap.map, ctx, -w);
      rx(ctx);
      ctx.fillStyle = gradient(ctx, {
        x: mx,
        y: my
      }, {
        x: x,
        y: y
      }, reach, .2);
      ctx.fill();
      ctx.restore();
    }

    function renderPage(ctx, image, map, x, dir) {
      ctx.drawImage(image, x, -h2, w, h);
      ctx.beginPath();
      ctx.moveTo(0, -h2);
      ctx.lineTo(0, h2);
      ctx.lineTo(dir, h2);
      ctx.lineTo(dir, -h2);
      ctx.closePath();
      renderAreas(map, ctx, x);
      ctx.fillStyle = gradient(ctx, {
        x: 0,
        y: 0
      }, {
        x: dir,
        y: 0
      }, .1, .05);
      ctx.fill();
    }

    function renderer(left, right, leftMap, rightMap, corner, x, y, backLeft, backRight, backLeftMap, backRightMap) {
      var ctx = canvas.getContext("2d");
      ctx.save();
      ctx.translate(w, topMargin + h2);
      ctx.clearRect(-w, -h2 - topMargin, 2 * w, h + topMargin + bottomMargin);
      if (left) renderPage(ctx, left, leftMap.map, -w, -w);
      if (right) renderPage(ctx, right, rightMap.map, 0, w);
      if (corner) renderOverleaf(ctx, corner, x, y, backLeft, backRight, backLeftMap, backRightMap);
      ctx.restore();
    }

    renderer.nearestCorner = nearestCorner;
    renderer.oppositeCorner = oppositeCorner;
    renderer.toLocalCoordinates = toLocalCoordinates;
    return renderer;
  }

  function loadImage(uri) {
    return new Promise(function (resolve, reject) {
      var img;
      img = document.createElement("img");
      img.addEventListener("load", function () {
        return resolve(img);
      }, false);
      img.addEventListener("error", function () {
        return reject(uri);
      }, false);
      img.src = uri;
    });
  }

  function loadImages(pages) {
    return pages.map(function (page) {
      return loadImage(page.image);
    });
  }

  ;

  function flipper(book, pages, data) {
    var options = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];
    pages = pages.map(function (page) {
      return typeof page === 'string' ? {
        image: page,
        map: []
      } : page;
    });
    options = Object.assign({
      scale: 0.8,
      spotsize: 0.08
    }, options);
    var canvas = book.appendChild(document.createElement("canvas"));
    return Promise.all(loadImages(pages)).then(function (images) {
      var _computeEmbedSize = computeEmbedSize(images[0], options.scale);

      var _computeEmbedSize2 = _slicedToArray(_computeEmbedSize, 2);

      var W = _computeEmbedSize2[0];
      var H = _computeEmbedSize2[1];
      var spotsize = W * options.spotsize;
      var dataset = {
        selection: data,
        hover: {}
      };
      var render = createRenderer(W, H, canvas, dataset);
      var currentPage = 0;
      var leftPage = images[currentPage - 1];
      var rightPage = images[currentPage];
      var leftMap = pages[currentPage - 1];
      var rightMap = pages[currentPage];
      var incomingLeftPage = null;
      var incomingRightPage = null;
      var incomingLeftMap = null;
      var incomingRightMap = null;
      render(leftPage, rightPage, leftMap, rightMap);

      function dropAnimation(mouse, target, corner, leftPage, rightPage, leftMap, rightMap, incomingLeftPage, incomingRightPage, incomingLeftMap, incomingRightMap) {
        var scaleX = linear(mouse.x, target.x);
        var scaleY = linear(mouse.y, target.y);
        return function (a) {
          return render(leftPage, rightPage, leftMap, rightMap, corner, scaleX(a), scaleY(a), incomingLeftPage, incomingRightPage, incomingLeftMap, incomingRightMap);
        };
      }

      function dragCorner(corner) {
        return function (event) {
          event.preventDefault();
          var mouse = render.toLocalCoordinates(event);
          return render(images[currentPage - 1], images[currentPage], pages[currentPage - 1], pages[currentPage], corner, mouse.x, mouse.y, incomingLeftPage, incomingRightPage, incomingLeftMap, incomingRightMap);
        };
      }

      var animating = false;

      function dropCorner(corner, moveListener, timeStamp) {
        var listener = function listener(event) {
          event.preventDefault();
          document.removeEventListener("mousemove", moveListener);
          document.removeEventListener("touchmove", moveListener);
          document.removeEventListener("mouseup", listener);
          document.removeEventListener("touchend", listener);
          var mouse = render.toLocalCoordinates(event);
          var target = undefined;

          if (event.timeStamp - timeStamp < CLICK_THRESHOLD) {
            if (animating || newPage) return;
            var newPage = currentPage + 2 * corner.direction;
            if (newPage < 0 || newPage > pages.length) return;
            target = render.oppositeCorner(mouse);
          } else {
            target = render.nearestCorner(mouse);
          }

          animating = true;
          return animate(dropAnimation(mouse, target, corner, leftPage, rightPage, leftMap, rightMap, incomingLeftPage, incomingRightPage, incomingLeftMap, incomingRightMap), 300).then(function () {
            animating = false;

            if (target !== corner) {
              currentPage += 2 * corner.direction;
              leftPage = images[currentPage - 1];
              rightPage = images[currentPage];
              leftMap = pages[currentPage - 1];
              rightMap = pages[currentPage];
              book.dispatchEvent(new CustomEvent("mercury:pagechange", {
                detail: {
                  currentPage: currentPage,
                  lastPage: !pages[currentPage + 1]
                }
              }));
            }

            return render(leftPage, rightPage, leftMap, rightMap);
          });
        };

        return listener;
      }

      function hotspot(mx, my) {
        var x = Math.abs(mx);
        var y = Math.abs(my);
        return W - spotsize <= x && x <= W && H / 2 - spotsize <= y && y <= H / 2;
      }

      function animateCorner(mouse) {
        if (hotspot(Math.abs(mouse.x), Math.abs(mouse.y))) {
          var corner = render.nearestCorner(mouse);
          var direction = corner.direction;
          var newPage = currentPage + 2 * direction;
          if (newPage < 0 || newPage > pages.length) return;

          if (direction < 0) {
            incomingLeftPage = images[newPage];
            incomingRightPage = images[newPage - 1];
            incomingLeftMap = pages[newPage];
            incomingRightMap = pages[newPage - 1];
          } else {
            incomingLeftPage = images[newPage - 1];
            incomingRightPage = images[newPage];
            incomingLeftMap = pages[newPage - 1];
            incomingRightMap = pages[newPage];
          }

          var onMouseMove = dragCorner(corner);
          document.addEventListener("mousemove", onMouseMove, false);
          document.addEventListener("touchmove", onMouseMove, false);
          var onMouseUp = dropCorner(corner, onMouseMove, mouse.timeStamp);
          document.addEventListener("mouseup", onMouseUp, false);
          document.addEventListener("touchend", onMouseUp, false);
          render(images[currentPage - 1], images[currentPage], pages[currentPage - 1], pages[currentPage], corner, mouse.x, mouse.y, incomingLeftPage, incomingRightPage, incomingLeftMap, incomingRightMap);
        }
      }

      book.addEventListener("mousedown", function (event) {
        event.preventDefault();
        animateCorner(render.toLocalCoordinates(event));
      });
      book.addEventListener("touchstart", function (event) {
        event.preventDefault();
        animateCorner(render.toLocalCoordinates(event));
      });
      var hitTesters = {
        circle: function circle(mouse, coords) {
          var _coords3 = _slicedToArray(coords, 3);

          var x = _coords3[0];
          var y = _coords3[1];
          var r = _coords3[2];
          return Math.hypot(mouse.x - x, mouse.y - y) <= r;
        },
        rectangle: function rectangle(mouse, coords) {
          var _coords4 = _slicedToArray(coords, 4);

          var x1 = _coords4[0];
          var y1 = _coords4[1];
          var x2 = _coords4[2];
          var y2 = _coords4[3];
          return x1 <= mouse.x && mouse.x <= x2 && y1 <= mouse.y && mouse.y <= y2;
        }
      };
      book.addEventListener("mousemove", function (event) {
        var changed = false;

        var hitTester = function hitTester(mouse) {
          return function (name, areas) {
            return areas.forEach(function (area) {
              if (shapeSelector(hitTesters, area.shape)(mouse, area.coords)) {
                if (!dataset.hover[name]) {
                  console.log("over", name);
                  dataset.hover[name] = true;
                  changed = true;
                }
              } else {
                if (dataset.hover[name]) {
                  console.log("out", name);
                  dataset.hover[name] = false;
                  changed = true;
                }
              }
            });
          };
        };

        var mouse = render.toLocalCoordinates(event);
        mouse.y += H / 2;
        if (pages[currentPage]) iterate(pages[currentPage].map, hitTester(mouse));
        mouse.x += W;
        if (pages[currentPage - 1]) iterate(pages[currentPage - 1].map, hitTester(mouse));
        if (changed) render(leftPage, rightPage, leftMap, rightMap);
      });
    });
  }
});