const { create, env } = require('sanctuary')
const S = create({ checkTypes: false, env: env })
;['map', 'concat', 'chain', 'alt', 'ap', 'reduce', 'traverse'].forEach(
  method => {
    aliasFantasyLand(S.Left, method)
    aliasFantasyLand(S.Right, method)
    aliasFantasyLand(S.Just, method)
    aliasFantasyLand(S.Nothing, method)
  }
)

S.Left.prototype.getOrElse = function (fallback) {
  return S.fromEither(fallback, this)
}
S.Right.prototype.getOrElse = function (fallback) {
  return S.fromEither(fallback, this)
}
S.Just.prototype.getOrElse = function (fallback) {
  return S.fromMaybe(fallback, this)
}
S.Nothing.getOrElse = function (fallback) {
  return S.fromMaybe(fallback, this)
}

function aliasFantasyLand (TypeDef, method) {
  if ( TypeDef === S.Nothing ) { 
    TypeDef[method] = TypeDef['fantasy-land' + method]
  } else {
  TypeDef.prototype[method] = TypeDef.prototype['fantasy-land/' + method]
  }
}

module.exports = S
