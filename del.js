#! /usr/bin/env node
const path = require('path'),
  del = require('del')
let dir  = path.resolve(process.cwd(), process.argv[2])
del(dir)