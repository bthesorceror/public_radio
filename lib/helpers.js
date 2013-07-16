exports.proxy = function(func, context) {
  return function() {
    func.apply(context, arguments);
  }
}

