var path

function onMouseDown (event) {
  path = new Path()
  path.strokeColor = 'black'
  path.strokeWidth = 3
}

function onMouseDrag (event) {
  if (path.segments.length > 1) {
    path.lastSegment.point.x = event.point.x
    path.lastSegment.point.y = event.point.y
  } else {
    path.add(event.point)
  }
}

function onMouseUp (event) {
  if (path.segments.length < 2) {
		return
	}
  var arrow = new Path.RegularPolygon(event.point, 3, 9)
  arrow.fillColor = 'black'
  var vector = path.lastSegment.point - path.firstSegment.point
  arrow.rotate(vector.angle + 90)
}
