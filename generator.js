var canvas = document.getElementById('canvas');
var ctx = canvas.getContext( '2d' );
var input = document.getElementById('in');
var polygons = [];

function reset() {
  polygons = [];
  alternateColorCount = 0;
}

var Env = {
  isStatic: function() {
    return 1; // 0 => show animation; 1 => display static
  },
  size: 600,
  renderInterval: 350
}

var DataSource = {
  data: window.languageData,
  normalizedData: {},
  getChar: function(c) {
    c = c.toLowerCase();
    if (this.normalizedData[c] === undefined) {
      return " ";
    } else {
      return this.normalizedData[c];
    }
  },
  init: function() {
    var self = this;
    _.each(this.data, function(item, index) {
      if (index === 'languageName') return;
      var maxFrequency = _.max(_.flatten(item));
      self.normalizedData[index] = _.map(item, function(val, i) {
        return val/maxFrequency;
      });
    });
  }
}
DataSource.init();

function polygon() {
  return canvas.appendChild( document.createElementNS(canvas.namespaceURI, 'polygon') );
}

function hexCoords(radius, variations) {
  variations = variations || [1,1,1,1,1,1];
  return variations.map(function(variation, n) {
    return point( Math.cos(Math.PI/3*n) * radius * (1+variation.get()),
                  Math.sin(Math.PI/3*n) * radius * (1+variation.get()) );
  });
}

function partialHexCoords(radius, limit, variations) {
  return [].concat(
            point(0,0),   // add a middle point
            hexCoords(radius, variations).splice(0, Math.ceil(6*limit)),
            point(Math.cos(Math.PI*2*limit)*radius,
                  Math.sin(Math.PI*2*limit)*radius) );
}

function createChar(char) {
  var c = {
    'char': char,
    polygon: polygon(),
    color: alternateColor(),
    variations: variationsFromChar(char), //randomVariations(),
    animationSpeed: 0.01 + Math.random() * 0.02,
    animationCount: Env.isStatic()
  };
  //c.polygon.setAttribute('fill', randomColor());
  //c.polygon.setAttribute('transform', 'translate(300, 300), rotate(-90)');
  //c.polygon.setAttribute('points', list(hexCoords(100, c.variations)));
  return c;
}

function variationsFromChar(char) {
  return [0, 1, 2, 3, 4, 5].map(function(el) {
    return variationGenerator( DataSource.getChar(char)[el] );
  });
}

function variationGenerator(mag) {
  return {
    'mag': mag,
    animationCount: 0,
    animationSpeed: 0.01 + Math.random() * 0.01,
    state: 0,
    update: function() {
      this.animationCount += this.animationSpeed;
      //this.state = Math.sin(this.animationCount)*this.mag; // Animates with a sine curve
      this.state = this.mag;
    },
    get: function() { return this.state }
  };
}

function animate() {
  polygons.forEach(function(p) {
    p.variations.forEach(function(v) {
       v.update();
    });
    if (p.animationCount < 1) {
      p.animationCount += p.animationSpeed;
      p.polygon.setAttribute('points', list(partialHexCoords(100, p.animationCount, p.variations)));
    } else {
      p.polygon.setAttribute('points', list(hexCoords(100, p.variations)));
    }
  });
  window.requestAnimationFrame(animate);
}
//window.requestAnimationFrame(animate);

// ===== Canvas Initialization =====
var proc = new Processing( canvas, function( proc ) {
  proc.setup = function() {
    proc.size( Env.size*2, Env.size*2 );
    proc.noStroke();
    canvas.style.transformOrigin = "0 0";
    canvas.style.transform = "scale(0.5)";
  }

  proc.draw = function() {
    ctx.clearRect( 0, 0, proc.width, proc.height );
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalCompositeOperation = 'lighter';

    polygons.forEach(function(p) {
      p.variations.forEach(function(v) {
         v.update();
      });
      if (p.animationCount < 1) {
        p.animationCount += p.animationSpeed;
        //p.polygon.setAttribute('points', list(partialHexCoords(100, p.animationCount, p.variations)));
        proc.fill.apply(proc, p.color);
        drawPolygon( partialHexCoords(Env.size/2, p.animationCount, p.variations), proc )
      } else {
        //p.polygon.setAttribute('points', list(hexCoords(100, p.variations)));
        proc.fill.apply(proc, p.color);
        drawPolygon( hexCoords(Env.size/2, p.variations), proc );
      }
    });
  }
});

function renderString(inputStr) {
  for (var i=0; i<inputStr.length; i++) {
    if (polygons[i] === undefined || polygons[i].char !== inputStr[i]) {
      polygons[i] = createChar(inputStr[i]);
    }
  }
}

// ===== Interactions =====
input.addEventListener('input', function(e) {
  renderString( e.currentTarget.value );
});

document.getElementById('clear').addEventListener('click', function(e) {
  reset();
  input.value = "";
  input.focus();
});

document.getElementById('save').addEventListener('click', function(e) {
  var img = Canvas2Image.saveAsPNG( canvas, true, Env.size*2, Env.size*2 );
  document.getElementsByTagName('body')[0].appendChild(img);
});

document.getElementById('save-sequence').addEventListener('click', function(e) {
  var raw = window.prompt("Gimme gimme!")
  var persons = raw.split('***');
  var i = -1;
  var interval = window.setInterval(function() {
    if (i < persons.length-1) {
      i++;
      reset();
      input.value = persons[i];
      renderString(persons[i]);
      window.setTimeout( function() {
        saveToDisk(persons[i], "");
      }, Env.renderInterval/2);
    } else {
      window.clearInterval(interval);
    }
  }, Env.renderInterval);
});

function saveToDisk(name, company) {
  name = name || 'image-' + new Date().getTime();
  dataObj = canvas.toDataURL('image/png');

  $.post( 'http://localhost/push/saveImage.php', {
      'data': dataObj,
      'name': name,
      'company': company
    }, function (data) {
      console.log(data);
    }
  );
}

// ===== Helper Functions =====
function drawPolygon(points, proc) {
  proc.pushMatrix();
  proc.translate(proc.width/2, proc.height/2);
  proc.rotate(proc.radians(90));
  proc.beginShape();
  _.each(points, function(p) {
    proc.vertex(p.x, p.y);
  });
  proc.vertex(points[0].x, points[0].y);
  proc.endShape();
  proc.popMatrix();
}

function point(x, y) {
  return {'x': x, 'y': y};
}

function coords(point) {
  return point.x + " " + point.y;
}

function list(ar) {
  var r = '';
  ar.forEach(function(point) {
    r = r + " " + coords(point);
  });
  return r;
}

function randomVariations() {
  return [0, 1, 2, 3, 4, 5].map(function(el) {
    return variationGenerator( 0.1 + Math.random()*0.4 );
  });
}

function randomColor() {
  if (Math.random() > 0.5) {
    return [0, 208, 208, 80];
  } else {
    return [197, 2, 101, 80];
  }
}

var alternateColorCount = 0;
function alternateColor() {
  alternateColorCount++;
  if (alternateColorCount % 2 === 0) {
    return [0, 208, 208, 80];
  } else {
    return [197, 2, 101, 80];
  }
}
