const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')

class FileHandle {
  constructor () {
    this.inited = false
    this.callstack = []
  }

  // 添加/修改 文件
  add (entry, output, callback) {
    // 输出文件所在目录不存在时，抛出错误
    let dir = output.replace(/\\[^\\]*$/, '') // 输出文所在件目录
    if (!fs.existsSync(output) && !fs.existsSync(dir)) {
      throw new Error(`输出文件所在目录不存在，或已删除：${dir}\n`)
    }

    // 需要转换就跳出
    if (this.isTransform(entry, output, callback)) return

    // 不需要就直接输出
    FileHandle.create(entry, output, callback)
  }



  // 判断是否需要转换
  isTransform (entry, output, callback) {
    // 返回值
    let v = false
    // 匹配是否为有后缀文件
    let suffixR = new RegExp(/\.[^\\]*$/)
    let suffix = suffixR.exec(entry)
    
    // 不是就跳出
    if (!suffix) {
      return v
    }

    // 输入/输出 文件后缀再做处理
    if (suffix[0] === '.styl') suffix[0] = '.stylus'
    output = output.replace(/\.[^\\]*$/, '.wxss')

    let style = ['.stylus', '.css']
    style.forEach(item => {
      // 判断是否为需要转换的文件
      if (suffix[0] === item) {
        // 如果正在初始化，就加入调用栈
        if (!this.inited) {
          this.callstack.push([entry, output, item.replace(/^\./, '')])
          v = true
          return
        }
        // 如果已经初始化，就直接执行
        this.transform(entry, output, item.replace(/^\./, ''))
          .then(suceess => {
            callback(suceess)
          })
        v = true
      }
    })

    return v
  }



  // 初始化完成，执行异步调用栈
  call () {
    // 调整初始化状态
    this.inited = true

    return new Promise((resolve, reject) => {
      // 计数器
      let n = 0
      // 存放then返回数据
      let data = []
      this.callstack.forEach(item => {
        this.transform(...item)
          .then(stdout =>{
            data.push(stdout)
            // 完成 +1
            ++n
            // 如果全面完成返回 resolve
            if (n === this.callstack.length) resolve(data)
          })
          .catch(error => {
            reject(error)
            })
      })
    })
  }



  // 文件转换
  transform (entry, output, option) {
    return new Promise((resolve, reject) => {
      // console.log('stdout')
      // 若是空文件，则直接创建
      if (FileHandle.isEmpty(entry)) {
        FileHandle.create(entry, output, () => {
          resolve(false)
        })
        return
      }

      let command
      const postcssCfg = path.join(__dirname, 'postcss.config.js')
      switch (option) {
        case 'stylus':
          command = `npx stylus ${entry} -p | npx postcss -o ${output} --config ${postcssCfg}`
          break
        case 'css':
          command = `npx postcss ${entry} -o ${output} --config ${postcssCfg}`
          break
      }


      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error)
          return
        }
        if (stderr) {
          reject(stderr)
          return
        }
        if (stdout) {
          resolve(stdout)
          return
        }
        resolve(false)
      })
    })
  }




  // =================================================静态方法
  // 创建文件
  static create (entry, output, callback) {
    const  write = fs.createWriteStream(output)
    write.on('close', () => {
      callback && callback()
    })
    fs.createReadStream(entry, 'utf8')
      .pipe(write)
  }

  // 是否为空文件
  static isEmpty (filePath) {
    if (!fs.readFileSync(filePath, { encoding: 'utf8' })) {
      return true
    }
    return false
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
    console.log(outputDir)
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
