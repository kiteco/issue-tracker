// pointToOffet takes the contents of the buffer and a point object
// representing the cursor, and returns a byte-offset for the cursor
function pointToOffset(text, point) {
  var lines = text.split("\n");
  var total = 0;
  for (var i = 0; i < lines.length && i < point.row; i++) {
    total += lines[i].length;
  }
  total += point.column + point.row; // we add point.row to add in all newline characters
  return total;
}

module.exports = {
  pointToOffset: pointToOffset,
};
