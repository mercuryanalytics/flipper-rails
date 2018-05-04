(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(["exports"], factory);
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
    if (shape in kit) return kit[shape];
    return kit.rect;
  }

  function once(callback) {
    var handler = function handler(event) {
      event.target.removeEventListener(event.type, handler);
      callback(event);
    };
    return handler;
  }

  var RGBA = /^\s*rgba\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(\d+)\s*\)\s*$/;
  function inferBackgroundColor(node) {
    var color = window.getComputedStyle(node).backgroundColor;
    var match = RGBA.exec(color);
    if (match && Number(match[1]) === 0 && node.parentNode) return inferBackgroundColor(node.parentNode);
    return color;
  }
  window.inferBackgroundColor = inferBackgroundColor;

  function pointInPolygon(x, y, coords) {
    function crosses(x1, y1, x2, y2) {
      if (y1 <= y && y2 > y || y1 > y && y2 <= y) {
        var vt = (y - y1) / (y2 - y1);
        if (x < x1 + vt * (x2 - x1)) return true;
      }
      return false;
    }

    var n = 0;
    var i = void 0;
    for (i = 2; i < coords.length; i += 2) {
      if (crosses(coords[i - 2], coords[i - 1], coords[i], coords[i + 1])) n++;
    }
    if (crosses(coords[i - 2], coords[i - 1], coords[0], coords[1])) n++;
    return n & 1 === 1;
  }

  function computeEmbedSize(image, scale) {
    var singlePage = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

    if (scale === null || scale === undefined || scale <= 0) return [image.naturalWidth, image.naturalHeight, 1];
    var n = singlePage ? 1 : 2;

    var W = window.innerWidth;
    var H = window.innerHeight;

    var availableWidth = scale * W;
    var availableHeight = scale * H;

    var aspect = n * image.naturalWidth / image.naturalHeight;
    var height = Math.floor(availableHeight);
    var width = Math.floor(height * aspect);
    if (width > availableWidth) {
      width = Math.floor(availableWidth);
      height = Math.floor(width / aspect);
    }

    return [width / n, height];
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

  function gradient(ctx, from, to, mid, strength) {
    if (strength === null || strength === undefined) strength = .5;
    var fx = from.x;
    var fy = from.y;
    var tx = to.x;
    var ty = to.y;
    var result = ctx.createLinearGradient(fx, fy, fx + strength * (tx - fx), fy + strength * (ty - fy));
    result.addColorStop(0, "rgba(0,0,0," + mid.toFixed(4) + ")");
    result.addColorStop(1, "rgba(0,0,0,0)");
    return result;
  }

  var makeShapeRenderers = function makeShapeRenderers(h2) {
    return {
      circle: function circle(ctx, x0, coords) {
        var _coords = _slicedToArray(coords, 3),
            x = _coords[0],
            y = _coords[1],
            r = _coords[2];

        ctx.arc(x0 + x, y - h2, r, 0, 2 * Math.PI, false);
      },
      rect: function rect(ctx, x0, coords) {
        var _coords2 = _slicedToArray(coords, 4),
            x1 = _coords2[0],
            y1 = _coords2[1],
            x2 = _coords2[2],
            y2 = _coords2[3];

        ctx.rect(x0 + x1, y1 - h2, x2 - x1, y2 - y1);
      },
      poly: function poly(ctx, x0, coords) {
        ctx.beginPath();
        ctx.moveTo(x0 + coords[0], coords[1] - h2);
        for (var i = 2; i < coords.length; i += 2) {
          ctx.lineTo(x0 + coords[i], coords[i + 1] - h2);
        }
        ctx.closePath();
      }
    };
  };

  function isTouchEvent(event) {
    return event.type && event.type.substr(0, 5) === "touch";
  }

  function createSinglePageRenderer(canvas, dataset, _ref) {
    var width = _ref.width,
        height = _ref.height,
        scale = _ref.scale;

    var w = width;
    var h = height;
    var h2 = h / 2;

    canvas.width = w;
    canvas.height = h;
    canvas.style.marginTop = 0;
    canvas.style.marginBottom = 0;
    canvas.style.marginLeft = 0;
    canvas.style.marginRight = 0;
    canvas.style.padding = 0;

    function toLocalCoordinates(mouse) {
      var timeStamp = mouse.timeStamp;
      if (isTouchEvent(mouse)) mouse = mouse.changedTouches[0];
      var x = mouse.clientX;
      var y = mouse.clientY;

      var _canvas$getBoundingCl = canvas.getBoundingClientRect(),
          left = _canvas$getBoundingCl.left,
          top = _canvas$getBoundingCl.top;

      return { x: x - left, y: y - top - h2, timeStamp: timeStamp };
    }

    var shapeRenderers = makeShapeRenderers(h2);

    function shapeStyler(s, style) {
      var color = style.color;
      if (dataset.hover[s]) {
        if (dataset.selection[s]) return function (ctx) {
          ctx.fillStyle = color;ctx.globalAlpha = 0.5;
        };
        return function (ctx) {
          ctx.fillStyle = color;ctx.globalAlpha = 0.3;
        };
      }
      if (dataset.selection[s]) return function (ctx) {
        ctx.fillStyle = color;ctx.globalAlpha = 0.4;
      };
      return function (ctx) {
        ctx.globalAlpha = 0.0;
      };
    }

    function renderAreas(map, ctx, x) {
      var renderer = function renderer(shape) {
        return function (ctx, x, coords, setStyle) {
          ctx.save();
          setStyle(ctx);
          ctx.beginPath();
          shapeSelector(shapeRenderers, shape)(ctx, x, coords.map(function (x) {
            return x * scale;
          }));
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        };
      };

      var style = window.getComputedStyle(ctx.canvas);
      iterate(map, function (name, areas) {
        return areas.forEach(function (area) {
          return renderer(area.shape)(ctx, x, area.coords, shapeStyler(name, style));
        });
      });
    }

    function renderPage(ctx, image, map) {
      ctx.drawImage(image, -w, -h2, w, h);
      ctx.beginPath();
      ctx.moveTo(0, -h2);
      ctx.lineTo(0, h2);
      ctx.lineTo(-w, h2);
      ctx.lineTo(-w, -h2);
      ctx.closePath();
      renderAreas(map, ctx, -w);
      ctx.fillStyle = gradient(ctx, { x: 0, y: 0 }, { x: -w, y: 0 }, .1, .05);
      ctx.fill();
    }

    function renderer(image, page) {
      var ctx = canvas.getContext("2d");
      ctx.save();
      ctx.translate(w, h2);
      ctx.clearRect(-w, -h2, 2 * w, h);
      renderPage(ctx, image, page.map);
      ctx.restore();
    }

    renderer.toLocalCoordinates = toLocalCoordinates;
    renderer.dimensions = { width: width, height: height, topMargin: 0, bottomMargin: 0 };
    return renderer;
  }

  function createRenderer(canvas, dataset, _ref2) {
    var width = _ref2.width,
        height = _ref2.height,
        scale = _ref2.scale;

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

    function toLocalCoordinates(mouse) {
      var timeStamp = mouse.timeStamp;
      if (isTouchEvent(mouse)) mouse = mouse.changedTouches[0];
      var x = mouse.clientX;
      var y = mouse.clientY;

      var _canvas$getBoundingCl2 = canvas.getBoundingClientRect(),
          left = _canvas$getBoundingCl2.left,
          top = _canvas$getBoundingCl2.top;

      return { x: x - left - w, y: y - top - h2 - topMargin, timeStamp: timeStamp };
    }

    var topLeft = {
      x: -w, y: -h2, direction: -1, backX: -w,
      transform: function transform(x, y, x1, y1, x2, y2) {
        return {
          x: x, y: y,
          tx: function tx(ctx) {
            ctx.translate(x1, -h2);ctx.rotate(Math.atan2(y + h2, x - x1));ctx.translate(Math.hypot(x - x1, y + h2), h2);
          },
          rx: function rx(ctx) {
            ctx.translate(-Math.hypot(x - x1, y + h2), -h2);ctx.rotate(-Math.atan2(y + h2, x - x1));ctx.translate(-x1, h2);
          },
          leaf: -w > y1 ? function (ctx) {
            ctx.moveTo(0, x2);ctx.lineTo(-Math.hypot(x - x1, y + h2), -h2);ctx.lineTo(0, -h2);
          } : function (ctx) {
            ctx.moveTo(-w - y1, h2);ctx.lineTo(-Math.hypot(x - x1, y + h2), -h2);ctx.lineTo(0, -h2), ctx.lineTo(0, h2);
          },
          back: -w > y1 ? function (ctx) {
            ctx.moveTo(-w, -h2);ctx.lineTo(x1, -h2);ctx.lineTo(-w, x2);
          } : function (ctx) {
            ctx.moveTo(-w, -h2);ctx.lineTo(x1, -h2);ctx.lineTo(y1, h2);ctx.lineTo(-w, h2);
          },
          page: -w > y1 ? function (ctx) {
            ctx.moveTo(x1, -h2);ctx.lineTo(-w, x2);ctx.lineTo(-w, h2);ctx.lineTo(w, h2);ctx.lineTo(w, -h2);
          } : function (ctx) {
            ctx.moveTo(w, -h2);ctx.lineTo(x1, -h2);ctx.lineTo(y1, h2);ctx.lineTo(w, h2);
          }
        };
      }
    };
    var bottomLeft = {
      x: -w, y: h2, direction: -1, backX: -w,
      transform: function transform(x, y, x1, y1, x2, y2) {
        return {
          x: x, y: y,
          tx: function tx(ctx) {
            ctx.translate(y1, h2);ctx.rotate(Math.atan2(y - h2, x - y1));ctx.translate(Math.hypot(y - h2, x - y1), -h2);
          },
          rx: function rx(ctx) {
            ctx.translate(-Math.hypot(y - h2, x - y1), h2);ctx.rotate(-Math.atan2(y - h2, x - y1));ctx.translate(-y1, -h2);
          },
          leaf: -w > x1 ? function (ctx) {
            ctx.moveTo(-Math.hypot(x - y1, y - h2), h2);ctx.lineTo(0, x2);ctx.lineTo(0, h2);
          } : function (ctx) {
            ctx.moveTo(-Math.hypot(x - y1, y - h2), h2);ctx.lineTo(-w - x1, -h2);ctx.lineTo(0, -h2);ctx.lineTo(0, h2);
          },
          back: -w > x1 ? function (ctx) {
            ctx.moveTo(-w, h2);ctx.lineTo(y1, h2);ctx.lineTo(-w, x2);
          } : function (ctx) {
            ctx.moveTo(-w, -h2);ctx.lineTo(x1, -h2);ctx.lineTo(y1, h2);ctx.lineTo(-w, h2);
          },
          page: -w > x1 ? function (ctx) {
            ctx.moveTo(y1, h2);ctx.lineTo(-w, x2);ctx.lineTo(-w, -h2);ctx.lineTo(w, -h2);ctx.lineTo(w, h2);
          } : function (ctx) {
            ctx.moveTo(w, -h2);ctx.lineTo(x1, -h2);ctx.lineTo(y1, h2);ctx.lineTo(w, h2);
          }
        };
      }
    };
    var topRight = {
      x: w, y: -h2, direction: 1, backX: 0,
      transform: function transform(x, y, x1, y1, x2, y2) {
        return {
          x: x, y: y,
          tx: function tx(ctx) {
            ctx.translate(x1, -h2);ctx.rotate(Math.atan2(y + h2, x - x1) - Math.PI);ctx.translate(w - Math.hypot(y + h2, x - x1), h2);
          },
          rx: function rx(ctx) {
            ctx.translate(Math.hypot(y + h2, x - x1) - w, -h2);ctx.rotate(-Math.atan2(y + h2, x - x1) - Math.PI);ctx.translate(-x1, h2);
          },
          leaf: y1 > w ? function (ctx) {
            ctx.moveTo(Math.hypot(x - x1, y + h2) - w, -h2);ctx.lineTo(-w, y2);ctx.lineTo(-w, -h2);
          } : function (ctx) {
            ctx.moveTo(Math.hypot(x - x1, y + h2) - w, -h2);ctx.lineTo(-y1, h2);ctx.lineTo(-w, h2);ctx.lineTo(-w, -h2);
          },
          back: y1 > w ? function (ctx) {
            ctx.moveTo(w, -h2);ctx.lineTo(x1, -h2);ctx.lineTo(w, y2);
          } : function (ctx) {
            ctx.moveTo(w, -h2);ctx.lineTo(x1, -h2);ctx.lineTo(y1, h2);ctx.lineTo(w, h2);
          },
          page: y1 > w ? function (ctx) {
            ctx.moveTo(x1, -h2);ctx.lineTo(w, y2);ctx.lineTo(w, h2);ctx.lineTo(-w, h2);ctx.lineTo(-w, -h2);
          } : function (ctx) {
            ctx.moveTo(-w, -h2);ctx.lineTo(x1, -h2);ctx.lineTo(y1, h2);ctx.lineTo(-w, h2);
          }
        };
      }
    };
    var bottomRight = {
      x: w, y: h2, direction: 1, backX: 0,
      transform: function transform(x, y, x1, y1, x2, y2) {
        return {
          x: x, y: y,
          tx: function tx(ctx) {
            ctx.translate(y1, h2);ctx.rotate(Math.atan2(y - h2, x - y1) - Math.PI);ctx.translate(w - Math.hypot(y - h2, x - y1), -h2);
          },
          rx: function rx(ctx) {
            ctx.translate(Math.hypot(y - h2, x - y1) - w, h2);ctx.rotate(-Math.atan2(y - h2, x - y1) - Math.PI);ctx.translate(-y1, -h2);
          },
          leaf: x1 > w ? function (ctx) {
            ctx.moveTo(-w, y2);ctx.lineTo(Math.hypot(x - y1, y - h2) - w, h2);ctx.lineTo(-w, h2);
          } : function (ctx) {
            ctx.moveTo(-x1, -h2);ctx.lineTo(Math.hypot(x - y1, y - h2) - w, h2);ctx.lineTo(-w, h2);ctx.lineTo(-w, -h2);
          },
          back: x1 > w ? function (ctx) {
            ctx.moveTo(w, h2);ctx.lineTo(y1, h2);ctx.lineTo(w, y2);
          } : function (ctx) {
            ctx.moveTo(w, -h2);ctx.lineTo(x1, -h2);ctx.lineTo(y1, h2);ctx.lineTo(w, h2);
          },
          page: x1 > w ? function (ctx) {
            ctx.moveTo(y1, h2);ctx.lineTo(w, y2);ctx.lineTo(w, -h2);ctx.lineTo(-w, -h2);ctx.lineTo(-w, h2);
          } : function (ctx) {
            ctx.moveTo(-w, -h2);ctx.lineTo(x1, -h2);ctx.lineTo(y1, h2);ctx.lineTo(-w, h2);
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
        var _scale = w / Math.hypot(x, y - cy);
        x *= _scale;
        y *= _scale;
      }

      if (Math.abs(y) > h2 && y * cy > 0) {
        if (Math.abs(x) > w) {
          var _nearestCorner = nearestCorner({ x: x, y: y });

          x = _nearestCorner.x;
          y = _nearestCorner.y;
        } else {
          var outerLimit = Math.hypot(w, h);
          var b = Math.hypot(x, y + cy); // TODO: find a better name
          if (b > outerLimit) {
            var _scale2 = outerLimit / b;
            x = _scale2 * x;
            y = _scale2 * (y + cy) - cy;
          }
        }
      } else {
        var _outerLimit = w;
        var d = Math.hypot(x, y - cy); // TODO: find a better name
        if (d > _outerLimit) {
          var _scale3 = _outerLimit / d;
          x = _scale3 * x;
          y = _scale3 * (y - cy) + cy;
        }
      }

      var mx = (x - cx) / 2;
      var my = (y - cy) / 2;
      var g = mx; // TODO: find a better name
      var t = -my; // TODO: find a better name
      mx += cx;
      my += cy;
      return corner.transform(x, y, (-h2 - my) * t / g + mx, (h2 - my) * t / g + mx, (-w - mx) * g / t + my, (w - mx) * g / t + my);
    }

    var shapeRenderers = makeShapeRenderers(h2);

    function shapeStyler(s, style) {
      var color = style.color;
      if (dataset.hover[s]) {
        if (dataset.selection[s]) return function (ctx) {
          ctx.fillStyle = color;ctx.globalAlpha = 0.5;
        };
        return function (ctx) {
          ctx.fillStyle = color;ctx.globalAlpha = 0.3;
        };
      }
      if (dataset.selection[s]) return function (ctx) {
        ctx.fillStyle = color;ctx.globalAlpha = 0.4;
      };
      return function (ctx) {
        ctx.globalAlpha = 0.0;
      };
    }

    function renderAreas(map, ctx, x) {
      var renderer = function renderer(shape) {
        return function (ctx, x, coords, setStyle) {
          ctx.save();
          setStyle(ctx);
          ctx.beginPath();
          shapeSelector(shapeRenderers, shape)(ctx, x, coords.map(function (x) {
            return x * scale;
          }));
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        };
      };

      var style = window.getComputedStyle(ctx.canvas);
      iterate(map, function (name, areas) {
        return areas.forEach(function (area) {
          return renderer(area.shape)(ctx, x, area.coords, shapeStyler(name, style));
        });
      });
    }

    function renderOverleaf(ctx, corner, mouseX, mouseY, leftImage, rightImage, leftMap, rightMap) {
      var _calculateLeafGeometr = calculateLeafGeometry(mouseX, mouseY, corner),
          x = _calculateLeafGeometr.x,
          y = _calculateLeafGeometr.y,
          tx = _calculateLeafGeometr.tx,
          rx = _calculateLeafGeometr.rx,
          leaf = _calculateLeafGeometr.leaf,
          back = _calculateLeafGeometr.back,
          page = _calculateLeafGeometr.page;

      var cx = corner.x;
      var cy = corner.y;
      var mx = cx + (x - cx) / 2;
      var my = cy + (y - cy) / 2;
      var reach = 1 - .95 * Math.hypot(mx - cx, my - cy) / w;

      ctx.save();
      page(ctx);
      ctx.clip();
      ctx.fillStyle = gradient(ctx, { x: mx, y: my }, { x: x, y: y }, reach, .3);
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
      ctx.fillStyle = gradient(ctx, { x: mx, y: my }, corner, reach);
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
      ctx.fillStyle = gradient(ctx, { x: mx, y: my }, { x: x, y: y }, reach, .2);
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
      ctx.fillStyle = gradient(ctx, { x: 0, y: 0 }, { x: dir, y: 0 }, .1, .05);
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
    renderer.dimensions = { width: width, height: height, topMargin: topMargin, bottomMargin: bottomMargin };
    return renderer;
  }

  function loadImage(uri) {
    return new Promise(function (resolve, reject) {
      var img;
      img = new Image();
      img.crossOrigin = "anonymous";
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
  };
  function initialSelection(pages) {
    var result = {};
    pages.forEach(function (page) {
      return iterate(page.map, function (name) {
        result[name] = false;
      });
    });
    return result;
  }

  function installMagnifier(book, canvas, render, images, W, H, options) {
    var scale = options.scale,
        width = options.width,
        height = options.height;

    var borderRadius = options.borderRadius;
    if (isNaN(borderRadius)) borderRadius = Math.min(width, height) / 4;

    var magnifier = book.appendChild(document.createElement("div"));

    magnifier.style.display = "none";
    magnifier.style.position = "absolute";
    magnifier.style.width = width + "px";
    magnifier.style.height = height + "px";
    magnifier.style.border = "solid black 1px";
    magnifier.style.borderRadius = borderRadius + "px";
    magnifier.style.pointerEvents = 'none';
    magnifier.style.top = '0px';
    magnifier.style.left = W + "px";
    magnifier.style.backgroundSize = "auto " + scale * H + "px";
    magnifier.style.backgroundColor = inferBackgroundColor(canvas);
    magnifier.style.backgroundRepeat = "no-repeat";

    var magCanvas = document.createElement("canvas");
    var w = images[0].naturalWidth;
    var h = images[0].naturalHeight;
    magCanvas.width = 2 * w;
    magCanvas.height = h;

    var renderMagnifier = function renderMagnifier(page) {
      var ctx = magCanvas.getContext("2d");
      ctx.save();
      ctx.clearRect(0, 0, w, h);
      if (page > 0) ctx.drawImage(images[page - 1], 0, 0, w, h);
      if (page < images.length) ctx.drawImage(images[page], w, 0, w, h);
      ctx.restore();
      magnifier.style.backgroundImage = "url(" + magCanvas.toDataURL() + ")";
    };

    renderMagnifier(0);
    book.addEventListener("mercury:pagechange", function (event) {
      renderMagnifier(event.detail.currentPage);
    });

    var hideMagnifier = function hideMagnifier(event) {
      magnifier.style.display = "none";
    };
    var showMagnifier = function showMagnifier(event) {
      magnifier.style.display = "block";
    };
    canvas.addEventListener("mousedown", hideMagnifier);
    canvas.addEventListener("mouseout", hideMagnifier);
    canvas.addEventListener("mouseup", showMagnifier);
    canvas.addEventListener("mouseover", showMagnifier);
    var moveMagnifier = function moveMagnifier(event) {
      var mouse = render.toLocalCoordinates(event);
      var x = images.length === 1 ? 0 : W;
      var y = H / 2;
      magnifier.style.left = x + mouse.x - width / 2 + "px";
      magnifier.style.top = y + mouse.y - height / 2 + "px";

      var mx = width / 2 - scale * (mouse.x + W);
      var my = height / 2 - scale * (mouse.y + H / 2);

      magnifier.style.backgroundPosition = mx + "px " + my + "px";
    };

    canvas.addEventListener("mousemove", moveMagnifier);
    canvas.addEventListener("touchmove", moveMagnifier);
    canvas.addEventListener("touchstart", function (event) {
      event.preventDefault();
      moveMagnifier(event);
      showMagnifier();
      canvas.addEventListener("touchend", once(function (event) {
        event.preventDefault();
        hideMagnifier();
      }));
    });
  }

  var DEFAULT_OPTIONS = {
    scale: 0.8,
    spotsize: 0.08,
    magnifierRadius: 100,
    start: 0,
    minPage: 0,
    maxPage: -1
  };

  function normalizeIndex(index, modulus) {
    index %= modulus;
    if (index < 0) index += modulus;
    return index;
  }

  function even(x) {
    return (x & 1) === 0;
  }

  function scaleCoords(coords, xScale, yScale) {
    return coords.map(function (x, k) {
      if (k % 2 == 0) return x * xScale;
      return x * yScale;
    });
  }

  var hitTesters = {
    circle: function circle(mouse, coords) {
      var _coords3 = _slicedToArray(coords, 3),
          x = _coords3[0],
          y = _coords3[1],
          r = _coords3[2];

      return Math.hypot(mouse.x - x, mouse.y - y) <= r;
    },
    rect: function rect(mouse, coords) {
      var _coords4 = _slicedToArray(coords, 4),
          x1 = _coords4[0],
          y1 = _coords4[1],
          x2 = _coords4[2],
          y2 = _coords4[3];

      return x1 <= mouse.x && mouse.x <= x2 && y1 <= mouse.y && mouse.y <= y2;
    },
    poly: function poly(mouse, coords) {
      return pointInPolygon(mouse.x, mouse.y, coords);
    }
  };

  function singlePageFlipper(book, page, data, options) {
    page = typeof page === 'string' ? { image: page, map: {} } : Object.assign({ map: {} }, page);
    var pages = [page];
    options = Object.assign(DEFAULT_OPTIONS, options);

    var dataset = { selection: Object.assign(initialSelection(pages), data), hover: {} };
    var rerender = function rerender() {};

    book.style.position = "relative";
    var fieldNames = Object.keys(dataset.selection);
    Object.defineProperty(book, 'selection', {
      get: function get() {
        return dataset.selection;
      },
      set: function set(sel) {
        dataset.selection = Object.assign(initialSelection(pages), sel);
        rerender();
      }
    });

    Object.defineProperty(book, 'currentPage', { get: function get() {
        return 0;
      } });
    Object.defineProperty(book, 'layout', { get: function get() {
        return pages;
      } });
    Object.defineProperty(pages, 'fields', { value: function value() {
        return Object.keys(dataset.selection);
      } });

    return loadImage(page.image).then(function (image) {
      var startTime = performance.now();
      while (book.firstChild) {
        book.removeChild(book.firstChild);
      }var canvas = book.appendChild(document.createElement("canvas"));

      var _computeEmbedSize = computeEmbedSize(image, options.scale, true),
          _computeEmbedSize2 = _slicedToArray(_computeEmbedSize, 2),
          W = _computeEmbedSize2[0],
          H = _computeEmbedSize2[1];

      var scale = H / image.naturalHeight;
      var spotsize = W * options.spotsize;

      var images = [image];
      var render = createSinglePageRenderer(canvas, dataset, { width: W, height: H, scale: scale });
      if (!isNaN(options.magnifierScale)) {
        for (var i = 0; i < pages.length; i++) {
          pages[i].map = {};
        }installMagnifier(book, canvas, render, images, W, H, {
          scale: options.magnifierScale,
          width: options.magnifierWidth || options.magnifierHeight || options.magnifierRadius * 2,
          height: options.magnifierHeight || options.magnifierWidth || options.magnifierRadius * 2,
          borderRadius: options.magnifierCornerRadius
        });
      }

      rerender = function rerender() {
        render(image, page);
      };
      rerender();

      book.addEventListener("mousemove", function (event) {
        var changed = false;
        var newHover = {};

        var hitTester = function hitTester(mouse) {
          return function (name, areas) {
            if (areas.some(function (area) {
              return shapeSelector(hitTesters, area.shape)(mouse, area.coords.map(function (x) {
                return x * scale;
              }));
            })) newHover[name] = true;
            changed |= !!newHover[name] != !!dataset.hover[name];
          };
        };

        var mouse = render.toLocalCoordinates(event);
        mouse.y += H / 2;
        iterate(page.map, hitTester(mouse));
        mouse.x += W;

        if (changed) {
          dataset.hover = newHover;
          rerender();
        }
      });

      var timeout = void 0;
      window.addEventListener("scroll", function (event) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(function () {
          return rerender();
        }, 10);
      });
      book.addEventListener("click", function (event) {
        var hits = Object.keys(dataset.hover).filter(function (k) {
          return dataset.hover[k];
        });
        if (hits.length === 0) return;
        var sel = Object.assign({}, dataset.selection);
        var clearMisses = function clearMisses(k) {
          if (hits.indexOf(k) < 0) sel[k] = false;
        };
        switch (options.mode) {
          case 'single':
            hits = hits.slice(0, 1);
            fieldNames.forEach(clearMisses);
            break;
          case 'multiple':
            break;
          default:
            // one per page
            hits = hits.slice(0, 1);
            Object.keys(page.map).forEach(clearMisses);
            break;
        }

        hits.forEach(function (k) {
          sel[k] = !sel[k];
        });
        var totalSelected = Object.keys(sel).reduce(function (sum, val) {
          return sum + (sel[val] ? 1 : 0);
        }, 0);

        if (book.dispatchEvent(new CustomEvent("change", { cancelable: true, detail: { currentPage: 0, lastPage: true, selection: sel, changed: hits, elapsedTime: performance.now() - startTime } }))) {
          dataset.selection = sel;
          book.dispatchEvent(new CustomEvent("update", { detail: sel }));
        }
        rerender();
      });

      return render.dimensions;
    });
  }

  function flipper(book, pages, data) {
    var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

    if (pages.length === 1) return singlePageFlipper(book, pages[0], data, options);

    pages = pages.map(function (page) {
      return typeof page === 'string' ? { image: page, map: {} } : Object.assign({ map: {} }, page);
    });
    options = Object.assign(DEFAULT_OPTIONS, options);

    options.minPage = normalizeIndex(options.minPage, pages.length);
    options.maxPage = normalizeIndex(options.maxPage, pages.length);
    if (options.start !== pages.length) options.start = Math.min(Math.max(options.start, options.minPage), options.maxPage);

    var dataset = { selection: Object.assign(initialSelection(pages), data), hover: {} };
    var rerender = function rerender() {};

    book.style.position = "relative";
    var fieldNames = Object.keys(dataset.selection);
    Object.defineProperty(book, 'selection', {
      get: function get() {
        return dataset.selection;
      },
      set: function set(sel) {
        dataset.selection = Object.assign(initialSelection(pages), sel);
        rerender();
      }
    });

    var currentPage = options.start;
    Object.defineProperty(book, 'currentPage', { get: function get() {
        return currentPage / 2;
      } });
    Object.defineProperty(book, 'layout', { get: function get() {
        return pages;
      } });
    function pageFields(page) {
      if (page === undefined) return Object.keys(dataset.selection);
      var result = {};
      if (pages[page * 2 - 1]) Object.keys(pages[page * 2 - 1].map).forEach(function (k) {
        result[k] = true;
      });
      if (pages[page * 2]) Object.keys(pages[page * 2].map).forEach(function (k) {
        result[k] = true;
      });
      return Object.keys(result);
    }
    Object.defineProperty(pages, 'fields', { value: pageFields });

    return Promise.all(loadImages(pages)).then(function (images) {
      var startTime = performance.now();
      while (book.firstChild) {
        book.removeChild(book.firstChild);
      }var canvas = book.appendChild(document.createElement("canvas"));

      var _computeEmbedSize3 = computeEmbedSize(images[0], options.scale),
          _computeEmbedSize4 = _slicedToArray(_computeEmbedSize3, 2),
          W = _computeEmbedSize4[0],
          H = _computeEmbedSize4[1];

      var scale = H / images[0].naturalHeight;
      var spotsize = W * options.spotsize;

      var render = createRenderer(canvas, dataset, { width: W, height: H, scale: scale });
      if (!isNaN(options.magnifierScale)) {
        for (var i = 0; i < pages.length; i++) {
          pages[i].map = {};
        }installMagnifier(book, canvas, render, images, W, H, {
          scale: options.magnifierScale,
          width: options.magnifierWidth || options.magnifierHeight || options.magnifierRadius * 2,
          height: options.magnifierHeight || options.magnifierWidth || options.magnifierRadius * 2,
          borderRadius: options.magnifierCornerRadius
        });
      } else {
        pages.forEach(function (page, i) {
          var pageXScale = images[0].naturalWidth / images[i].naturalWidth;
          var pageYScale = images[0].naturalHeight / images[i].naturalHeight;
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = Object.keys(page.map)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var key = _step.value;

              page.map[key].forEach(function (shape) {
                shape.coords = scaleCoords(shape.coords, pageXScale, pageYScale);
              });
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }
        });
      }

      var leftPage = images[currentPage - 1];
      var rightPage = images[currentPage];
      var leftMap = pages[currentPage - 1];
      var rightMap = pages[currentPage];
      rerender = function rerender() {
        render(leftPage, rightPage, leftMap, rightMap);
      };

      var incomingLeftPage = null;
      var incomingRightPage = null;
      var incomingLeftMap = null;
      var incomingRightMap = null;
      rerender();

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
            if (newPage < options.minPage || newPage > options.maxPage + 1) return;
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
              book.dispatchEvent(new CustomEvent("mercury:pagechange", { detail: { currentPage: currentPage, lastPage: !pages[currentPage + 1] } }));
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
          if (newPage < options.minPage || newPage > options.maxPage + 1) return;
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
          // TODO: maybe: document.addEventListener("touchcancel", onMouseUp);

          render(images[currentPage - 1], images[currentPage], pages[currentPage - 1], pages[currentPage], corner, mouse.x, mouse.y, incomingLeftPage, incomingRightPage, incomingLeftMap, incomingRightMap);
        }
      }

      book.addEventListener("mousedown", function (event) {
        event.preventDefault();animateCorner(render.toLocalCoordinates(event));
      });
      book.addEventListener("touchstart", function (event) {
        event.preventDefault();animateCorner(render.toLocalCoordinates(event));
      });
      book.addEventListener("mousemove", function (event) {
        var changed = false;
        var newHover = {};

        var hitTester = function hitTester(mouse) {
          return function (name, areas) {
            if (areas.some(function (area) {
              return shapeSelector(hitTesters, area.shape)(mouse, area.coords.map(function (x) {
                return x * scale;
              }));
            })) newHover[name] = true;
            changed |= !!newHover[name] != !!dataset.hover[name];
          };
        };

        var mouse = render.toLocalCoordinates(event);
        mouse.y += H / 2;
        if (pages[currentPage]) iterate(pages[currentPage].map, hitTester(mouse));
        mouse.x += W;
        if (pages[currentPage - 1]) iterate(pages[currentPage - 1].map, hitTester(mouse));

        if (changed) {
          dataset.hover = newHover;
          rerender();
        }
      });

      var timeout = void 0;
      window.addEventListener("scroll", function (event) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(function () {
          return rerender();
        }, 10);
      });
      book.addEventListener("click", function (event) {
        var hits = Object.keys(dataset.hover).filter(function (k) {
          return dataset.hover[k];
        });
        if (hits.length === 0) return;
        var sel = Object.assign({}, dataset.selection);
        var clearMisses = function clearMisses(k) {
          if (hits.indexOf(k) < 0) sel[k] = false;
        };
        switch (options.mode) {
          case 'single':
            hits = hits.slice(0, 1);
            fieldNames.forEach(clearMisses);
            break;
          case 'multiple':
            break;
          default:
            // one per page
            hits = hits.slice(0, 1);
            if (pages[currentPage]) Object.keys(pages[currentPage].map).forEach(clearMisses);
            if (pages[currentPage - 1]) Object.keys(pages[currentPage - 1].map).forEach(clearMisses);
            break;
        }

        hits.forEach(function (k) {
          sel[k] = !sel[k];
        });
        var totalSelected = Object.keys(sel).reduce(function (sum, val) {
          return sum + (sel[val] ? 1 : 0);
        }, 0);

        if (book.dispatchEvent(new CustomEvent("change", { cancelable: true, detail: { currentPage: currentPage / 2, lastPage: !pages[currentPage + 1], selection: sel, changed: hits, elapsedTime: performance.now() - startTime } }))) {
          dataset.selection = sel;
          book.dispatchEvent(new CustomEvent("update", { detail: sel }));
        }
        rerender();
      });

      return render.dimensions;
    });
  }
});