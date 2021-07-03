/**
 * Rearrange several layers from a grid pattern to their respective ZOrder in Layers panel
 * Top > Bottom, Left > Right
 *
 * Reference results here:
 * https://imgur.com/a/2SlC2dN
 *
 * Author: Tom Scharstein
 * https://github.com/Inventsable
 */

var doc = app.activeDocument;

// Polyfill for ES6 Array iteration
Array.prototype.forEach = function (callback) {
  for (var i = 0; i < this.length; i++) callback(this[i], i, this);
};

// Utility for converting AI Collections to standard Arrays
function get(type, parent, deep) {
  if (arguments.length == 1 || !parent) {
    parent = app.activeDocument;
    deep = false;
  }
  var result = [];
  if (!parent[type]) return [];
  for (var i = 0; i < parent[type].length; i++) {
    result.push(parent[type][i]);
    if (parent[type][i][type] && deep)
      result = [].concat(result, get(type, parent[type][i]));
  }
  return result || [];
}

var majorList = [];

// Iterate over each layer in order
get("layers").forEach(function (layer, index) {
  var left = [],
    top = [],
    right = [],
    bottom = [],
    minorList = [];

  // Iterate over all the pageItems of this layer
  get("pageItems", layer).forEach(function (item, i) {
    // Collect the bounding box of this item
    var bounds = getVisibleBounds(item, true);
    left.push(bounds[0]);
    top.push(bounds[1]);
    right.push(bounds[2]);
    bottom.push(bounds[3]);

    // Collect bounds of item to later sort within layer
    minorList.push({
      bounds: bounds,
      index: i,
    });
  });

  // Grab canonical layer contents
  var itemList = get("pageItems", layer);

  // Iterate through sorted layer contents and rearrange
  minorList.sort(sortByCardinalXMajorYMinor);
  if (minorList.length > 1)
    minorList.forEach(function (item, i) {
      itemList[item.index].zOrder(ZOrderMethod.SENDTOBACK);
    });

  // Add layer data to top-level list
  majorList.push({
    index: index,
    name: layer.name,
    bounds: [
      left.sort()[0],
      top.sort()[0],
      right.sort().reverse()[0],
      bottom.sort().reverse()[0],
    ],
  });
});

// Sort methods to determine order via position
function sortByCardinalYMajorXMinor(a, b) {
  var bY = b.bounds[1] * -1,
    aY = a.bounds[1] * -1,
    bX = b.bounds[0],
    aX = a.bounds[0];
  if (aY == bY) return aX - bX;
  else return aY - bY || aX - bX;
}
function sortByCardinalXMajorYMinor(a, b) {
  var bY = b.bounds[1] * -1,
    aY = a.bounds[1] * -1,
    bX = b.bounds[0],
    aX = a.bounds[0];
  return aY <= bY ? aX - bX : aY - bY || aX - bX;
}

// Mutate the root array
majorList.sort(sortByCardinalYMajorXMinor);

// Reference the original layer order to retrieve layer objects
var layerList = get("layers");

// Then move the layers according to the sorted array
majorList.forEach(function (item) {
  layerList[item.index].zOrder(ZOrderMethod.SENDTOBACK);
});

// Thanks m1b
// https://graphicdesign.stackexchange.com/a/138086
function getVisibleBounds(item, geometric) {
  var bounds;
  if (item.typename == "GroupItem" && item.clipped) {
    var clippingItem;
    for (var i = 0; i < item.pageItems.length; i++) {
      if (item.pageItems[i].clipping) {
        clippingItem = item.pageItems[i];
        break;
      } else if (item.pageItems[i].typename == "CompoundPathItem") {
        if (item.pageItems[i].pathItems[0].clipping) {
          clippingItem = item.pageItems[i];
          break;
        }
      }
    }
    bounds = geometric
      ? clippingItem.geometricBounds
      : clippingItem.visibleBounds;
  } else {
    bounds = geometric ? item.geometricBounds : item.visibleBounds;
  }
  return bounds;
}
