#!/usr/bin/env node
const App = require('./lib/main')
  , path = require('path')

const config = {
  entry: process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : path.join(process.cwd(), 'src'),
  output: process.argv[3] ? path.resolve(process.cwd(), process.argv[3]) : path.join(process.cwd(), 'dist')
}

// 帮助
if (process.argv[2] === '-h' || process.argv[2] === '--help') {
  console.log(`
  Useg: wxss <entry> <output>
  
  默认: 
    entry 为项目目录下的 ./src
    ouput 为项目目录下的 ./dist
  `)
  return
}

// 若用户只设置输入，没设置输出，则终止
if (process.argv.length === 3) throw new Error('请指定输出目录')
// 启动
else new App(config).main()
