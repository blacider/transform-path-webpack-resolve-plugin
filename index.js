var assign = require('object-assign');
var forEachBail = require('enhanced-resolve/lib/forEachBail');

module.exports = function (options) {
  var optionsToUse = options || {};
  var include = optionsToUse.include;

  optionsToUse.include = include && !Array.isArray(include) ? [include] : include;
  return {
    apply: doApply.bind(this, optionsToUse)
  };
};

function doApply(options, resolver) {

  //定义pipeline的下一节
  var target = resolver.ensureHook("resolve");

  resolver.getHook("file")
    .tapAsync("TransformPathWebpackResolvePlugin", (request, resolveContext, callback) => {

      var requestText = request.request || request.path; // require的地址
      var requestFilePath = request.context.issuer || ''; //当前处理文件的绝对地址

      var attempts = [];

      // return if path doesn't match with includes
      if (options.include && !options.include.some(function (include) {
        return requestFilePath.search(include) !== -1;
      })) {
        return callback();
      }

      if (options.transformFn) {
        var transformResult = options.transformFn(requestText, requestFilePath, request);

        if (!Array.isArray(transformResult)) {
          transformResult = [transformResult];
        }

        transformResult = transformResult.filter(function (attemptName) {
          return typeof attemptName === 'string' && attemptName.length > 0;
        });

        attempts = attempts.concat(transformResult);
      }

      //没有修改的不做处理 ，防止无限递归
      if (!attempts.length ||
        attempts.length === 1 && attempts[0] === requestText) {
        return callback();
      }

      //解析新的request
      forEachBail(
        attempts,

        function (requestText, innerCallback) {
          var obj = assign({}, request, {
            request: requestText
          });

          resolver.doResolve(target, obj, null, resolveContext, innerCallback);
        },

        callback
      );
    });
}
