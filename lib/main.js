const path = require('path')
  , fs = require('fs')
  , chokidar = require('chokidar')
  , FileHandle = require('./filehandle')

// 除了文件添加和更改，其他都是同步
class App extends FileHandle {
  constructor ({entry, output}) {
    super()
    this.entry = entry
    this.output = output
    this.watchs = chokidar.watch(this.entry)
    // 初始扫描文件处理进度 n / nn
    this.nn = 0
    this.n = 0
    // 初始化
    this.inited = false
  }


  async main () {
    // 输出目录重建
    await FileHandle.dist(this.output)
    ++this.n
    ++this.nn
    console.log(this.nn + ' / ' + this.n)

    this.watchs
      // 文件添加
      .on('add', changePath => {
        this.scan()
        this.tryCatch(async ()=> {
          let file = this.changeRelativePath(changePath, this.entry)
          await this.add(changePath, path.join(this.output, file))
          if (this.inited) console.log(`文件 ${file} 已添加`)
          this.success()
        })
      })

      // 文件更改
      .on('change', changePath => {
        this.tryCatch(async () => {
          let file = this.changeRelativePath(changePath, this.entry)
          await this.add(changePath, path.join(this.output, file))
          console.log(`文件 ${file} 已更改`)
        })
      })

      // 文件删除
      .on('unlink', changePath => {
          this.tryCatch(() => {
          let file = this.changeRelativePath(changePath, this.entry)
          FileHandle.rmFile(path.join(this.output, file), err => {
            console.log(`文件 ${file} 已删除`)
        })
        })
      })

      // 文件夹添加
      .on('addDir', changePath => {
        this.scan()
        this.tryCatch(() => {
          let file = this.changeRelativePath(changePath, this.entry)
          if (!file) {
            --this.nn
            return
          }
          fs.mkdirSync(path.join(this.output, file))
          if (this.inited) console.log(`文件夹 ${file} 已添加`)
          this.success()
        })
      })

      // 文件夹删除
      .on('unlinkDir', changePath => {
        this.tryCatch(() => {
          let file = this.changeRelativePath(changePath, this.entry)
          FileHandle.rmDir(path.join(this.output, file))
          console.log(`文件夹 ${path.join(this.output, file)} 已删除`)
        })
      })

      // 监听错误
      .on('error', error => {
        App.err(error)
      })
      
      // 初始扫描完成
      .on('ready', async () => {
      })
    }

    // 初始化完成
    complete () {
      this.inited = true
      console.log('初始化完成')
    }

    // 扫描出
    scan () {
      ++this.nn
      console.log(this.n + ' / ' + this.nn)
    }

    // 完成一个
    success () {
      ++this.n
      console.log(this.n + ' / ' + this.nn)
      if (this.n === this.nn) this.complete()
    }

    // 错误捕获
    tryCatch (callback) {
      try {
        callback()
      } catch (error) {
        App.err(error)
      }
    }

    // 错误处理函数
    static err (error) {
      if (App.errorHandle) {
        App.errorHandle(error)
      } else {
        console.log('\n调用者您有未捕获的错误：')
        throw error
      }
    }

    // 将绝对路径，处理为某个目录的相对路径
    changeRelativePath (absolute, dir) {
      // 将某个目录处理为正则
      const listenPathRegExp = new RegExp('^' + dir.replace(/\\/g, '\\\\'))
      // 进行处理
      let file = absolute.replace(listenPathRegExp, '')
      return file.replace(/^\\/, '')
    }

}

module.exports = App