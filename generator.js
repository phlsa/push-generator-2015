var canvas = document.getElementById('canvas');
var ctx = canvas.getContext( '2d' );
var input = document.getElementById('in');
var polygons = [];
var animationSequence = [];
var currentSequenceIndex = -1;

function reset() {
  polygons = [];
  alternateColorCount = 0;
}

var Env = {
  isStatic: function() {
    return 0; // 0 => show animation; 1 => display static
  },
  size: 600,
  renderInterval: 350,
  letterDelay: 200,
  sequenceItemUpTime: 2000 
}

var DataSource = {
  data: window.languageData,
  normalizedData: {},
  getChar: function(c) {
    c = c.toLowerCase();
    if (this.normalizedData[c] === undefined) {
      return "a";
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
      if (!Env.isStatic()) {
        this.state = Math.sin(this.animationCount)*0.1+this.mag; // Animates with a sine curve
      } else {
        this.state = this.mag;
      }
    },
    get: function() { return this.state }
  };
}

// ===== Canvas Initialization =====
var proc = new Processing( canvas, function( proc ) {
  proc.setup = function() {
    proc.size( Env.size, Env.size );
    proc.noStroke();
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
        proc.fill.apply(proc, p.color);
        drawPolygon( partialHexCoords(Env.size/5, p.animationCount, p.variations), proc );
      } else {
        proc.fill.apply(proc, p.color);
        drawPolygon( hexCoords(Env.size/5, p.variations), proc );
      }
    });
  }
});

function renderString(inputStr) {
  for (var i=0; i<inputStr.length; i++) {
    if (polygons[i] === undefined || polygons[i].char !== inputStr[i]) {
      if (!Env.isStatic()) {
        function iterate() {
          var cachedIndex = i;
            window.setTimeout(function() {
              polygons[cachedIndex] = createChar(inputStr[cachedIndex]);
              $('#text-container').children()[cachedIndex].classList.add(_.sample(['up', 'down']));
            }, Env.letterDelay*cachedIndex);
        }
        iterate();
      } else {
          polygons[i] = createChar(inputStr[i]);
      }
    }
  }

  if (!Env.isStatic()) {
    window.setTimeout(sequenceItemBuildFinished, inputStr.length*Env.letterDelay);
  }
}

function renderAnimatedSequence(inputArray) {
  reset();
  animationSequence = inputArray;
  currentSequenceIndex = 0;
  renderString(animationSequence[currentSequenceIndex]);
  $('#text-container').empty().append( spanify(animationSequence[currentSequenceIndex]) );
}

function sequenceItemBuildFinished() {
  window.setTimeout(function() {
    canvas.classList.add('shrink');
    $('#text-container').addClass('fade-out');
    window.setTimeout(function() {
      reset();
      _.delay(function() {
        canvas.classList.remove('shrink');
        $('#text-container').removeClass('fade-out');
        currentSequenceIndex++;
        if (currentSequenceIndex >= animationSequence.length) {
          currentSequenceIndex = 0;
        }
        renderString(animationSequence[currentSequenceIndex]);
        $('#text-container').empty().append( spanify(animationSequence[currentSequenceIndex]) );
      }, 100);
    }, 300);
  }, Env.sequenceItemUpTime);
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

document.getElementById('full-screen').addEventListener('click', function(e) {
  var container = document.getElementById('container');
  if (container.requestFullscreen) {
    container.requestFullscreen();
  } else if (container.mozRequestFullScreen) {
    container.mozRequestFullScreen();
  } else if (container.webkitRequestFullscreen) {
    container.webkitRequestFullscreen();
  }
});

document.getElementById('animate-sequence').addEventListener('click', function() {
  var raw = window.prompt("Gimme gimme!");
  var persons = raw.split('***');
  renderAnimatedSequence(persons);
});

document.getElementById('save').addEventListener('click', function(e) {
  var img = Canvas2Image.saveAsPNG( canvas, true, Env.size, Env.size );
  document.getElementsByTagName('body')[0].appendChild(img);
});

document.getElementById('save-sequence').addEventListener('click', function(e) {
  var raw = window.prompt("Gimme gimme!");
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

function spanify (str) {
  return _.map(str, function(letter) {
    if (letter === " ") letter = '&nbsp;'
    return $('<span>' + letter + '</span>');
  });
}
