const path = require('path')
  , fs = require('fs')
  , chokidar = require('chokidar')
  , FileHandle = require('./filehandle')
  , { changeRelativePath } = require('./utils')

class App extends FileHandle {
  constructor ({entry, output}) {
    super()
    this.entry = entry
    this.output = output
    this.watchs = chokidar.watch(this.entry)
  }

  main () {
    // 输出目录重建
    FileHandle.dist(this.output)

    this.watchs
      // 文件添加
      .on('add', changePath => {
        this.tryCatch(()=> {
          let file = changeRelativePath(changePath, this.entry)
          this.add(changePath, path.join(this.output, file), () => {
            console.log(`文件 ${file} 已添加`)
          })
        })
      })

      // 文件更改
      .on('change', changePath => {
        this.tryCatch(() => {
          let file = changeRelativePath(changePath, this.entry)
          this.add(changePath, path.join(this.output, file), () => {
            console.log(`文件 ${file} 已更改`)
          })
        })
      })

      // 文件删除
      .on('unlink', changePath => {
          this.tryCatch(() => {
          let file = changeRelativePath(changePath, this.entry)
          FileHandle.rmFile(path.join(this.output, file), err => {
            console.log(`文件 ${file} 已删除`)
          })
        })
      })

      // 文件夹添加
      .on('addDir', changePath => {
        this.tryCatch(() => {
          let file = changeRelativePath(changePath, this.entry)
          if (!file) return
          fs.mkdirSync(path.join(this.output, file))
          console.log(`文件夹 ${file} 已添加`)
        })
      })

      // 文件夹删除
      .on('unlinkDir', changePath => {
        this.tryCatch(() => {
          let file = changeRelativePath(changePath, this.entry)
          FileHandle.rmDir(path.join(this.output, file))
          console.log(`文件夹 ${path.join(this.output, file)} 已删除`)
        })
      })

      // 监听错误
      .on('error', error => {
        App.err(error)
      })
      
      // 初始扫描完成
      .on('ready', () => {
        this.call()
          .then(stdoutArr => {
            console.log('初始化完成')
          })
      })
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

}

module.exports = App