// 将绝对路径，处理为某个目录的相对路径
function changeRelativePath (absolute, dir) {
  // 将某个目录处理为正则
  const listenPathRegExp = new RegExp('^' + dir.replace(/\\/g, '\\\\'))
  // 进行处理
  let file = absolute.replace(listenPathRegExp, '')
  return file.replace(/^\\/, '')
}

module.exports = {
  changeRelativePath
}