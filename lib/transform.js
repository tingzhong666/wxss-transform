const stylus  = require('stylus'),
  path = require('path'),
  postcss = require('postcss'),
  mpvueWxss = require('postcss-mpvue-wxss')

class Transform {
  constructor () {
    this.hookData = {}
    this.childs = []
  }

  /**
   * 源文件是否需要转换
   * @param {String} entry 必须。源文件，绝对路径
   * @param {Sting} output 必须。目标文件，绝对路径
   * @returns {Boolean|Object} 返回false，表示不需要转换
   *                           返回对象，表示需要转换，并且返回转换模式，与输出路径
   *                           { output: 输出路径, option: 转换模式 }
   */
  isTransform (entry, output) {
    // 返回值
    let v

    // 匹配是否为有后缀文件
    let suffixR = new RegExp(/\.[^\\]*$/)
    let suffix = suffixR.exec(entry)
    
    // 不是就跳出
    if (!suffix) {
      return false
    }

    // 输入/输出 文件后缀再做处理
    if (suffix[0] === '.styl') suffix[0] = '.stylus'
    output = output.replace(/\.[^\\]*$/, '.wxss')

    let style = ['.stylus', '.css']
    style.forEach(item => {
      // 判断是否为需要转换的文件
      if (suffix[0] === item) {
        v = {
          output,
          option: item.replace(/^\./, '')
        }
      }
    })

    return v
  }


  /**
   * 转换
   * @param {String} data 需要转换的数据
   * @param {String} option 进行转换的模式
   * @param {String} entry 可选。stylus 模式必选，处理stylus导入路径问题。
   * @returns [Promise] .then传入转换后的数据
   */
  async transform (data, option, entry = '') {
    // 转换处理
    switch (option) {
      case 'stylus':
        // 转换前处理函数
        data = await this.before(data, option, entry)

        data = await this.stylus(data)

        // 转换后处理函数
        data = await this.after(data, option)

        data = await this.transform(data, 'css')
        break
      case 'css':
        // 转换前处理函数
        data = await this.before(data, option, entry)

        let res = await postcss(mpvueWxss).process(data, { from: undefined })
        data = res.css

        // 转换后处理函数
        data = await this.after(data, option)
        break
    }
    // 转换完成
    return data
  }

  // stylus，不确定styl转换是不是异步，就直接封装一个Promise
  stylus (data) {
    return new Promise((resolve, reject) => {
      stylus(data)
        .render((err, res) => {
          if (err) {
            reject(err)
            return
          }
          resolve(res)
        })
    })
  }
  
  // 处理前
  before (data, option, entry = '') {
    switch (option) {
      case 'stylus':
        data = this.stylPath(data, entry)
        data = this.importWxss(data)
        break
    }
    return data
  }

  // 处理后
  after (data, option) {
    switch (option) {
      case 'stylus':
        data = this.importWxssB(data)
        break
    }
    return data
  }

  // styl @import 导入 .wxss 修复，前置处理
  importWxss (data) {
    const r = /^\@import.*\.wxss(\"|\')$/gm
    this.hookData.IWO = data.match(r)
    if (!this.hookData.IWO) return data
    this.hookData.IWN = []
    this.hookData.IWO.forEach(item => {
      let item1 = '/*' + item + '*/'
      this.hookData.IWN.push(item1)
      data = data.replace(item, item1)
    })
    return data
  }
  
  // styl @import 导入 .wxss 修复，后置处理
  importWxssB (data) {
    if (!this.hookData.IWO) return data
    this.hookData.IWN.forEach((item, index) => {
      data = data.replace(item, this.hookData.IWO[index] + ';')
    })
    return data
  }

  // styl 导入 .styl 路径 修复
  stylPath (data, entry) {
    // 如果是依赖文件监听，则跳出
    if (this.isChild) return data

    const entryDir = entry.replace(/(\\|\/)[^\\]*\.(styl|stylus)$/, '') // 入口文件的所在目录绝对路径
    const stylR = /^\@import.*\.(styl|stylus)(\'|\")$/gm
    let styl = data.match(stylR)
    if (styl) { // 导入文件相对路径转绝对路径
      styl.forEach(v => {
        let item = v.replace('@import "', '')
        item = item.replace("@import '", '')
        item = item.replace('"', '')
        item = item.replace("'", '')
        item = path.join(entryDir, item)
        item = `@import "${item}"`
        data = data.replace(v, item)
      })
    }

    return data
  }
}

module.exports = Transform
