"use strict";
const CLICK_THRESHOLD = 250;

function linear(min, max) { return (x) => min + x * (max - min); }
function iterate(o, fn) { return Object.keys(o).forEach((k) => fn(k, o[k])); }

function shapeSelector(kit, shape) {
  if (shape in kit) return kit[shape];
  return kit.rect;
}

function pointInPolygon(x, y, coords) {
  function crosses(x1, y1, x2, y2) {
    if (y1 <= y && y2 > y || y1 > y && y2 <= y) {
      const vt = (y - y1) / (y2 - y1);
      if (x < x1 + vt*(x2 - x1)) return true;
    }
    return false;
  }

  let n = 0;
  let i;
  for (i = 2; i < coords.length; i += 2) {
    if (crosses(coords[i - 2], coords[i - 1], coords[i], coords[i + 1])) n++;
  }
  if (crosses(coords[i - 2], coords[i - 1], coords[0], coords[1])) n++;
  return n & 1 === 1;
}


function computeEmbedSize(image, scale) {
  if (scale === null || scale === undefined || scale <= 0) return [image.naturalWidth, image.naturalHeight];

  let availableWidth = scale * (screen.width - Math.max(window.outerWidth - window.innerWidth, 0));
  let availableHeight = scale * (screen.width - Math.max(window.outerHeight - window.innerHeight, 0));
  if ('orientation' in window && ((window.orientation / 90) & 1) == 1) [availableWidth, availableHeight] = [availableHeight, availableWidth];

  const aspect = (2*image.naturalWidth) / image.naturalHeight;
  let height = Math.floor(availableHeight);
  let width = Math.floor(height * aspect);
  if (width > availableWidth) {
    width = availableWidth;
    height = Math.floor(width / aspect);
  }

  return [width/2, height];
}

function animate(renderFrame, duration) {
  return new Promise((resolve) => {
    let start = undefined;
    const tick = function(now) {
      const time = Math.min((now - start) / duration, 1);
      renderFrame(time);
      if (time < 1) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    };
    return requestAnimationFrame((now) => tick(start = now))
  })
}

function createRenderer(width, height, canvas, dataset) {
  const w = width;
  const h = height;
  const h2 = h/2;
  const topMargin = Math.hypot(w, h) - h;
  const bottomMargin = topMargin / 4;

  canvas.width = 2*w;
  canvas.height = topMargin + bottomMargin + h;
  canvas.style.marginTop = -topMargin + "px";
  canvas.style.marginBottom = -bottomMargin + "px";
  canvas.style.marginLeft = 0;
  canvas.style.marginRight = 0;
  canvas.style.padding = 0;

  function isTouchEvent(event) { return event.type && event.type.substr(0, 5) === "touch" }
  function toLocalCoordinates(mouse) {
    const timeStamp = mouse.timeStamp;
    if (isTouchEvent(mouse)) mouse = mouse.changedTouches[0];
    const x = mouse.clientX;
    const y = mouse.clientY;
    const { left, top } = canvas.getBoundingClientRect();
    return { x: x - left - w, y: y - top - h2 - topMargin, timeStamp };
  }

  const topLeft = {
    x: -w, y: -h2, direction: -1, backX: -w,
    transform: function(x,y,x1,y1,x2,y2) {
      return {
        x: x, y: y,
        tx: function(ctx) { ctx.translate(x1,-h2); ctx.rotate(Math.atan2(y+h2,x-x1)); ctx.translate(Math.hypot(x-x1,y+h2),h2); },
        rx: function(ctx) { ctx.translate(-Math.hypot(x-x1,y+h2),-h2); ctx.rotate(-Math.atan2(y+h2,x-x1)); ctx.translate(-x1,h2); },
        leaf: -w>y1
          ? function(ctx) { ctx.moveTo(0,x2); ctx.lineTo(-Math.hypot(x-x1,y+h2),-h2); ctx.lineTo(0,-h2); }
          : function(ctx) { ctx.moveTo(-w-y1,h2); ctx.lineTo(-Math.hypot(x-x1,y+h2),-h2); ctx.lineTo(0,-h2),ctx.lineTo(0,h2); },
        back: -w>y1
          ? function(ctx) { ctx.moveTo(-w,-h2); ctx.lineTo(x1,-h2); ctx.lineTo(-w,x2); }
          : function(ctx) { ctx.moveTo(-w,-h2); ctx.lineTo(x1,-h2); ctx.lineTo(y1,h2); ctx.lineTo(-w,h2); },
        page: -w>y1
          ? function(ctx) { ctx.moveTo(x1,-h2); ctx.lineTo(-w,x2); ctx.lineTo(-w,h2); ctx.lineTo(w,h2); ctx.lineTo(w,-h2); }
          : function(ctx) { ctx.moveTo(w,-h2); ctx.lineTo(x1,-h2); ctx.lineTo(y1,h2); ctx.lineTo(w,h2); }
      };
    }
  };
  const bottomLeft = {
    x: -w, y: h2, direction: -1, backX: -w,
    transform: function(x,y,x1,y1,x2,y2) {
      return {
        x: x, y: y,
        tx: function(ctx) { ctx.translate(y1,h2); ctx.rotate(Math.atan2(y-h2,x-y1)); ctx.translate(Math.hypot(y-h2,x-y1),-h2); },
        rx: function(ctx) { ctx.translate(-Math.hypot(y-h2,x-y1),h2); ctx.rotate(-Math.atan2(y-h2,x-y1)); ctx.translate(-y1,-h2); },
        leaf: -w>x1
          ? function(ctx) { ctx.moveTo(-Math.hypot(x-y1,y-h2),h2); ctx.lineTo(0,x2); ctx.lineTo(0,h2); }
          : function(ctx) { ctx.moveTo(-Math.hypot(x-y1,y-h2),h2); ctx.lineTo(-w-x1,-h2); ctx.lineTo(0,-h2); ctx.lineTo(0,h2); },
        back: -w>x1
          ? function(ctx) { ctx.moveTo(-w,h2); ctx.lineTo(y1,h2); ctx.lineTo(-w,x2); }
          : function(ctx) { ctx.moveTo(-w,-h2); ctx.lineTo(x1,-h2); ctx.lineTo(y1,h2); ctx.lineTo(-w,h2); },
        page: -w>x1
          ? function(ctx) { ctx.moveTo(y1,h2); ctx.lineTo(-w,x2); ctx.lineTo(-w,-h2); ctx.lineTo(w,-h2); ctx.lineTo(w,h2); }
          : function(ctx) { ctx.moveTo(w,-h2); ctx.lineTo(x1,-h2); ctx.lineTo(y1,h2); ctx.lineTo(w,h2); }
      };
    }
  };
  const topRight = {
    x: w, y: -h2, direction: 1, backX: 0,
    transform: function(x,y,x1,y1,x2,y2) {
      return {
        x: x, y: y,
        tx: function(ctx) { ctx.translate(x1,-h2); ctx.rotate(Math.atan2(y+h2,x-x1)-Math.PI); ctx.translate(w-Math.hypot(y+h2,x-x1),h2); },
        rx: function(ctx) { ctx.translate(Math.hypot(y+h2,x-x1)-w,-h2); ctx.rotate(-Math.atan2(y+h2,x-x1)-Math.PI); ctx.translate(-x1,h2); },
        leaf: y1>w
          ? function(ctx) { ctx.moveTo(Math.hypot(x-x1,y+h2)-w,-h2); ctx.lineTo(-w,y2); ctx.lineTo(-w,-h2); }
          : function(ctx) { ctx.moveTo(Math.hypot(x-x1,y+h2)-w,-h2); ctx.lineTo(-y1,h2); ctx.lineTo(-w,h2); ctx.lineTo(-w,-h2); },
        back: y1>w
          ? function(ctx) { ctx.moveTo(w,-h2); ctx.lineTo(x1,-h2); ctx.lineTo(w,y2); }
          : function(ctx) { ctx.moveTo(w,-h2); ctx.lineTo(x1,-h2); ctx.lineTo(y1,h2); ctx.lineTo(w,h2); },
        page: y1>w
          ? function(ctx) { ctx.moveTo(x1,-h2); ctx.lineTo(w,y2); ctx.lineTo(w,h2); ctx.lineTo(-w,h2); ctx.lineTo(-w,-h2); }
          : function(ctx) { ctx.moveTo(-w,-h2); ctx.lineTo(x1,-h2); ctx.lineTo(y1,h2); ctx.lineTo(-w,h2); }
      };
    }
  };
  const bottomRight = {
    x: w, y: h2, direction: 1, backX: 0,
    transform: function(x,y,x1,y1,x2,y2) {
      return {
        x: x, y: y,
        tx: function(ctx) { ctx.translate(y1,h2); ctx.rotate(Math.atan2(y-h2,x-y1)-Math.PI); ctx.translate(w-Math.hypot(y-h2,x-y1),-h2); },
        rx: function(ctx) { ctx.translate(Math.hypot(y-h2,x-y1)-w,h2); ctx.rotate(-Math.atan2(y-h2,x-y1)-Math.PI); ctx.translate(-y1,-h2); },
        leaf: x1>w
          ? function(ctx) { ctx.moveTo(-w,y2); ctx.lineTo(Math.hypot(x-y1,y-h2)-w,h2); ctx.lineTo(-w,h2); }
          : function(ctx) { ctx.moveTo(-x1,-h2); ctx.lineTo(Math.hypot(x-y1,y-h2)-w,h2); ctx.lineTo(-w,h2); ctx.lineTo(-w,-h2); },
        back: x1>w
          ? function(ctx) { ctx.moveTo(w,h2); ctx.lineTo(y1,h2); ctx.lineTo(w,y2); }
          : function(ctx) { ctx.moveTo(w,-h2); ctx.lineTo(x1,-h2); ctx.lineTo(y1,h2); ctx.lineTo(w,h2); },
        page: x1>w
          ? function(ctx) { ctx.moveTo(y1,h2); ctx.lineTo(w,y2); ctx.lineTo(w,-h2); ctx.lineTo(-w,-h2); ctx.lineTo(-w,h2); }
          : function(ctx) { ctx.moveTo(-w,-h2); ctx.lineTo(x1,-h2); ctx.lineTo(y1,h2); ctx.lineTo(-w,h2); }
      };
    }
  };

  function nearestCorner(pt) {
    if (pt.x < 0) {
      if (pt.y < 0)
        return topLeft;
      else
        return bottomLeft;
    } else {
      if (pt.y < 0)
        return topRight;
      else
        return bottomRight;
    }
  }

  function oppositeCorner(pt) {
    if (pt.x < 0) {
      if (pt.y < 0)
        return topRight;
      else
        return bottomRight;
    } else {
      if (pt.y < 0)
        return topLeft;
      else
        return bottomLeft;
    }
  }

  function calculateLeafGeometry(x, y, corner) {
    const cx = corner.x;
    const cy = corner.y;

    if (Math.abs(x) > w) {
      const scale = w / Math.hypot(x, y - cy);
      x *= scale;
      y *= scale;
    }

    if (Math.abs(y) > h2 && y * cy > 0) {
      if (Math.abs(x) > w) {
        ({ x, y } = nearestCorner({x: x, y: y}));
      } else {
        const outerLimit = Math.hypot(w, h);
        const b = Math.hypot(x, y + cy);      // TODO: find a better name
        if (b > outerLimit) {
          const scale = outerLimit / b;
          x = scale * x;
          y = scale * (y + cy) - cy;
        }
      }
    } else {
      const outerLimit = w;
      const d = Math.hypot(x, y - cy);        // TODO: find a better name
      if (d > outerLimit) {
        const scale = outerLimit / d;
        x = scale * x;
        y = scale * (y - cy) + cy;
      }
    }

    let mx = (x - cx)/2;
    let my = (y - cy)/2;
    const g = mx;                              // TODO: find a better name
    const t = -my;                             // TODO: find a better name
    mx += cx;
    my += cy;
    return corner.transform(x, y, (-h2-my)*t/g+mx, (h2-my)*t/g+mx, (-w-mx)*g/t+my, (w-mx)*g/t+my);
  }

  function gradient(ctx, from, to, mid, strength) {
    if (strength == null) strength = .5;
    const fx = from.x;
    const fy = from.y;
    const tx = to.x;
    const ty = to.y;
    const result = ctx.createLinearGradient(fx, fy, fx + strength * (tx - fx), fy + strength * (ty - fy));
    result.addColorStop(0, `rgba(0,0,0,${mid.toFixed(4)})`);
    result.addColorStop(1, "rgba(0,0,0,0)");
    return result;
  }

  const shapeRenderers = {
    circle(ctx, x0, coords) {
      const [x,y,r] = coords;
      ctx.arc(x0 + x, y - h2, r, 0, 2*Math.PI, false);
    },

    rect(ctx, x0, coords) {
      const [x1,y1,x2,y2] = coords;
      ctx.rect(x0 + x1, y1 - h2, x2 - x1, y2 - y1);
    },

    poly(ctx, x0, coords) {
      ctx.beginPath();
      ctx.moveTo(x0 + coords[0], coords[1] - h2);
      for (let i = 2; i < coords.length; i += 2) {
        ctx.lineTo(x0 + coords[i], coords[i + 1] - h2);
      }
      ctx.closePath();
    }
  }

  function shapeStyler(s, style) {
    const color = style.color;
    if (dataset.hover[s]) {
      if (dataset.selection[s]) return (ctx) => { ctx.fillStyle = color; ctx.globalAlpha = 0.5; };
      return (ctx) => { ctx.fillStyle = color; ctx.globalAlpha = 0.3; };
    }
    if (dataset.selection[s]) return (ctx) => { ctx.fillStyle = color; ctx.globalAlpha = 0.4; };
    return (ctx) => { ctx.globalAlpha = 0.0; };
  }

  function renderAreas(map, ctx, x) {
    const renderer = (shape) => (ctx, x, coords, setStyle) => {
      ctx.save();
      setStyle(ctx);
      ctx.beginPath();
      shapeSelector(shapeRenderers, shape)(ctx, x, coords);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const style = window.getComputedStyle(ctx.canvas);
    iterate(map, (name, areas) => areas.forEach((area) => renderer(area.shape)(ctx, x, area.coords, shapeStyler(name, style))));
  }

  function renderOverleaf(ctx, corner, mouseX, mouseY, leftImage, rightImage, leftMap, rightMap) {
    const { x, y, tx, rx, leaf, back, page } = calculateLeafGeometry(mouseX, mouseY, corner);
    const cx = corner.x;
    const cy = corner.y;
    const mx = cx + (x - cx)/2;
    const my = cy + (y - cy)/2;
    const reach = 1 - .95*Math.hypot(mx - cx, my - cy)/w;

    ctx.save();
    page(ctx);
    ctx.clip();
    ctx.fillStyle = gradient(ctx, {x:mx, y:my}, {x:x, y:y}, reach, .3);
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
    ctx.fillStyle = gradient(ctx, {x:mx, y:my}, corner, reach);
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
    ctx.fillStyle = gradient(ctx, {x:mx, y:my}, {x:x, y:y}, reach, .2);
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
    ctx.fillStyle = gradient(ctx, {x:0, y:0}, {x:dir, y:0}, .1, .05);
    ctx.fill();
  }

  function renderer(left, right, leftMap, rightMap, corner, x, y, backLeft, backRight, backLeftMap, backRightMap) {
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.translate(w, topMargin + h2);
    ctx.clearRect(-w, -h2 - topMargin, 2*w, h + topMargin + bottomMargin);
    if (left) renderPage(ctx, left, leftMap.map, -w, -w)
    if (right) renderPage(ctx, right, rightMap.map, 0, w)
    if (corner) renderOverleaf(ctx, corner, x, y, backLeft, backRight, backLeftMap, backRightMap);
    ctx.restore();
  }

  renderer.nearestCorner = nearestCorner;
  renderer.oppositeCorner = oppositeCorner;
  renderer.toLocalCoordinates = toLocalCoordinates;
  return renderer;
}

function loadImage(uri) {
  return new Promise((resolve, reject) => {
    var img;
    img = document.createElement("img");
    img.addEventListener("load", () => resolve(img), false);
    img.addEventListener("error", () => reject(uri), false);
    img.src = uri;
  });
}

function loadImages(pages) { return pages.map((page) => loadImage(page.image)); };
function initialSelection(pages) {
  const result = {};
  pages.forEach((page) => iterate(page.map, (name) => { result[name] = false; }));
  return result;
}

export default function flipper(book, pages, data, options = {}) {
  pages = pages.map((page) => typeof page === 'string' ? { image: page, map: [] } : Object.assign({ map: [] }, page));
  const dataset = { selection: Object.assign(initialSelection(pages), data), hover: {} };
  let rerender = () => {};
  Object.defineProperty(book, 'selection', {
    get: () => dataset.selection,
    set: (sel) => {
      dataset.selection = Object.assign(initialSelection(pages), sel);
      rerender();
    }
  })

  options = Object.assign({ scale: 0.8, spotsize: 0.08 }, options);
  const canvas = book.appendChild(document.createElement("canvas"));
  return Promise.all(loadImages(pages))
    .then(function(images) {
      const [W, H] = computeEmbedSize(images[0], options.scale);
      const spotsize = W * options.spotsize;
      const render = createRenderer(W, H, canvas, dataset);
      let currentPage = 0;
      let leftPage = images[currentPage-1];
      let rightPage = images[currentPage];
      let leftMap = pages[currentPage-1];
      let rightMap = pages[currentPage];
      rerender = () => { render(leftPage, rightPage, leftMap, rightMap); }

      let incomingLeftPage = null;
      let incomingRightPage = null;
      let incomingLeftMap = null;
      let incomingRightMap = null;
      rerender();

      function dropAnimation(mouse, target, corner, leftPage, rightPage, leftMap, rightMap, incomingLeftPage, incomingRightPage, incomingLeftMap, incomingRightMap) {
        const scaleX = linear(mouse.x, target.x);
        const scaleY = linear(mouse.y, target.y);
        return function(a) { return render(leftPage, rightPage, leftMap, rightMap, corner, scaleX(a), scaleY(a), incomingLeftPage, incomingRightPage, incomingLeftMap, incomingRightMap); }
      }

      function dragCorner(corner) {
        return function(event) {
          event.preventDefault();
          const mouse = render.toLocalCoordinates(event);
          return render(images[currentPage-1], images[currentPage], pages[currentPage-1], pages[currentPage], corner, mouse.x, mouse.y, incomingLeftPage, incomingRightPage, incomingLeftMap, incomingRightMap);
        };
      }

      let animating = false;
      function dropCorner(corner, moveListener, timeStamp) {
        const listener = function(event) {
          event.preventDefault();
          document.removeEventListener("mousemove", moveListener);
          document.removeEventListener("touchmove", moveListener);
          document.removeEventListener("mouseup", listener);
          document.removeEventListener("touchend", listener);

          const mouse = render.toLocalCoordinates(event);
          let target = undefined;
          if (event.timeStamp - timeStamp < CLICK_THRESHOLD) {
            if (animating || newPage) return;
            const newPage = currentPage + 2*corner.direction;
            if (newPage < 0 || newPage > pages.length) return;
            target = render.oppositeCorner(mouse);
          } else {
            target = render.nearestCorner(mouse);
          }
          animating = true;
          return animate(dropAnimation(mouse, target, corner, leftPage, rightPage, leftMap, rightMap, incomingLeftPage, incomingRightPage, incomingLeftMap, incomingRightMap), 300)
            .then(() => {
              animating = false;
              if (target !== corner) {
                currentPage += 2*corner.direction;
                leftPage = images[currentPage-1];
                rightPage = images[currentPage];
                leftMap = pages[currentPage-1];
                rightMap = pages[currentPage];
                book.dispatchEvent(new CustomEvent("mercury:pagechange", { detail: { currentPage, lastPage: !pages[currentPage+1] }}))
              }
              return render(leftPage, rightPage, leftMap, rightMap);
            })
        };
        return listener;
      }

      function hotspot(mx, my) {
        const x = Math.abs(mx);
        const y = Math.abs(my);
        return W-spotsize <= x && x <= W && H/2-spotsize <= y && y <= H/2;
      }

      function animateCorner(mouse) {
        if (hotspot(Math.abs(mouse.x), Math.abs(mouse.y))) {
          const corner = render.nearestCorner(mouse);
          const direction = corner.direction;
          const newPage = currentPage + 2*direction;
          if (newPage < 0 || newPage > pages.length) return;
          if (direction < 0) {
            incomingLeftPage = images[newPage];
            incomingRightPage = images[newPage-1];
            incomingLeftMap = pages[newPage];
            incomingRightMap = pages[newPage-1];
          } else {
            incomingLeftPage = images[newPage-1];
            incomingRightPage = images[newPage];
            incomingLeftMap = pages[newPage-1];
            incomingRightMap = pages[newPage];
          }

          const onMouseMove = dragCorner(corner);
          document.addEventListener("mousemove", onMouseMove, false);
          document.addEventListener("touchmove", onMouseMove, false);

          const onMouseUp = dropCorner(corner, onMouseMove, mouse.timeStamp);
          document.addEventListener("mouseup", onMouseUp, false);
          document.addEventListener("touchend", onMouseUp, false);
          // TODO: maybe: document.addEventListener("touchcancel", onMouseUp);

          render(images[currentPage-1], images[currentPage], pages[currentPage-1], pages[currentPage], corner, mouse.x, mouse.y, incomingLeftPage, incomingRightPage, incomingLeftMap, incomingRightMap);
        }
      }

      book.addEventListener("mousedown", (event) => { event.preventDefault(); animateCorner(render.toLocalCoordinates(event)); });
      book.addEventListener("touchstart", (event) => { event.preventDefault(); animateCorner(render.toLocalCoordinates(event)); });

      const hitTesters = {
        circle(mouse, coords) {
          const [x, y, r] = coords;
          return Math.hypot(mouse.x - x, mouse.y - y) <= r;
        },

        rect(mouse, coords) {
          const [x1,y1,x2,y2] = coords;
          return x1 <= mouse.x && mouse.x <= x2 && y1 <= mouse.y && mouse.y <= y2;
        },

        poly(mouse, coords) {
          return pointInPolygon(mouse.x, mouse.y, coords);
        }
      }

      book.addEventListener("mousemove", (event) => {
        let changed = false;
        const newHover = {};

        const hitTester = (mouse) => (name, areas) => {
          if (areas.some((area) => shapeSelector(hitTesters, area.shape)(mouse, area.coords))) newHover[name] = true;
          changed |= (!!newHover[name] != !!dataset.hover[name])
        };

        const mouse = render.toLocalCoordinates(event);
        mouse.y += H/2;
        if (pages[currentPage]) iterate(pages[currentPage].map, hitTester(mouse));
        mouse.x += W;
        if (pages[currentPage-1]) iterate(pages[currentPage-1].map, hitTester(mouse));

        if (changed) {
          dataset.hover = newHover;
          rerender();
        }
      });

      let timeout;
      window.addEventListener("scroll", (event) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => rerender(), 10);
      })
      book.addEventListener("click", (event) => {
        const hits = Object.keys(dataset.hover).filter((k) => dataset.hover[k]);
        hits.forEach((k) => { dataset.selection[k] = !dataset.selection[k]; });
        if (hits.length > 0) {
          book.dispatchEvent(new CustomEvent("change", { detail: { currentPage, lastPage: !pages[currentPage+1], selection: dataset.selection }}))
          rerender();
        }
      });
    });
}
