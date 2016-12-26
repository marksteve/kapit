var paper = window.paper

paper.setup(document.getElementById('photo'))

var tool = new paper.Tool()
var path

tool.onMouseDown = function (event) {
  path = new paper.Path()
  path.strokeColor = 'black'
  path.strokeWidth = 3
}

tool.onMouseDrag = function (event) {
  if (path.segments.length > 1) {
    path.lastSegment.point.x = event.point.x
    path.lastSegment.point.y = event.point.y
  } else {
    path.add(event.point)
  }
}

tool.onMouseUp = function (event) {
  if (path.segments.length < 2) {
    return
  }
  var arrow = new paper.Path.RegularPolygon(event.point, 3, 9)
  arrow.fillColor = 'black'
  var vector = path.lastSegment.point.subtract(path.firstSegment.point)
  arrow.rotate(vector.angle + 90)
}

