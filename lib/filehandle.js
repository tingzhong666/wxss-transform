const fs = require('fs')
const path = require('path')
const Transform = require('./transform')

// 除了文件添加，其他处理方法必须同步
class FileHandle extends Transform {
  constructor () {
    super()
    this.inited = false // false 代表初始化还没结束
    this.callstack = []
  }

  // 添加/修改 文件
  async add (entry, output) {
    // 输出文件所在目录不存在时，抛出错误
    let dir = output.replace(/\\[^\\]*$/, '') // 输出文所在件目录
    if (!await FileHandle.exists(dir)) {
      throw new Error(`输出文件所在目录不存在，或已删除：${dir}\n`)
    }

    // 若是空文件，则跳出
    if (await FileHandle.isEmpty(entry)) return

    // 读取数据
    let data = await FileHandle.readFile(entry)

    let has = this.isTransform(entry, output)
    // 不需要转换，直接复制
    if (!has) {
      await FileHandle.writeFile(output, data)
      return
    }

    // 需要转换，初始化未结束，加入调用栈
    if (!this.inited) {
      this.callstack.push({
        // 需要转换的文件路径
        entry,
        // 转换模式
        option: has.option,
        // 需要转换的输出路径
        output: has.output
      })
      return
    }
    //  需要转换，已结束初始化，直接转换
    if (this.inited) {
      data = await this.transform(data, has.option, entry)
      await FileHandle.writeFile(has.output, data)
      return
    }
  }


  // 初始化完成，执行异步调用栈
  call () {
    // 调整初始化状态
    this.inited = true

    return new Promise((resolve, reject) => {
      this.callstack.forEach(async (item, index) => {
        try {
          let file = await FileHandle.readFile(item.entry)
          let d = await this.transform(file, item.option, item.entry)
          await FileHandle.writeFile(item.output, d)
          // 如果全部完成返回 resolve
          if (index === this.callstack.length - 1) resolve(true)
        } catch (error) {
          reject(error)
        }
      })
    })
  }


  // =================================================静态方法
  // 复制文件
  static copy (entry, output, callback) {
    fs.copyFile(entry, output, err => {
      if (err) {
        if (callback) {
          callback(err)
        } else {
          throw err
        }
      }
      callback && callback(null)
    })
  }


  // 是否为空文件
  static async isEmpty (filePath) {
    let data = await FileHandle.readFile(filePath)
    if (!data) {
      return true
    }
    return false
  }

  // 文件是否存在
  static exists (dir) {
    return new Promise((resolve, reject) => {
      try {
        fs.exists(dir, res => {
          resolve(res)
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  // 读取文件
  static readFile (dir) {
    return new Promise((resolve, reject) => {
      fs.readFile(dir, 'utf8', (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }

  // 文件写入
  static writeFile (dir, data) {
    return new Promise((resolve, reject) => {
        fs.writeFile(dir, data, err => {
          if (err) {
            reject(err)
            return
          }
          resolve(true)
      })
    })
  }

  // 删除文件
  static rmFile (filePath, callback) {
    // 目标文件可能是经过转换的 .wxss文件
    filePath = filePath.replace(/\.(css|styl|stylus)$/, '.wxss')
    // 如果文件不存在，就跳出
    if (!fs.existsSync(filePath)) return
    fs.unlink(filePath, err => {
      callback(err)
    })
  }
  // 注意：这里不需要同步执行，因为 chodidar 监听到删除目录，会先触发删除目录
  // 而删除目录时，删除目录内文件需要异步删除
  // 所以这里判断文件是否存在，因为可能 删除目录 事件里，已经删除过文件了

  // 删除文件夹
  static rmDir (dir) {
    // 删除目录内所有文件
    fs.readdirSync(dir).forEach(item => {
      fs.unlinkSync(path.join(dir, item))
    })
    fs.rmdirSync(dir)
  }
  // 注意：此方法并没有递归删除，因为 chokidar 会递归监听到删除的目录

  // 输出目录重建
  static dist (outputDir) {
    // 若存在，先删除
    fs.existsSync(outputDir) && FileHandle.rmRecursion(outputDir)
    // 创建目录
    fs.mkdirSync(outputDir)
  }

  // 文件夹递归删除
  static rmRecursion (dir) {
    fs.readdirSync(dir, {
      withFileTypes: true
    })
      .forEach(item => {
        // 如果是目录则递归
        if (item.isDirectory()) {
          FileHandle.rmRecursion(path.join(dir, item.name))
        } else {
          // 否则直接删除
          fs.unlinkSync(path.join(dir, item.name))
        }
      })
      // 删除空目录
      fs.rmdirSync(dir)
  }

}

module.exports = FileHandle
