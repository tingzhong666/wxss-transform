#  wxss-transform

一款用于开发小程序wxss的命令行工具。

wxss-transform 接收一个监听目录或文件，一个输出目录或文件

递归监听目录下所有文件变化，并输出项目代码到指定目录，输出前会将`stylus`或`css`文件转换为`wxss`文件，其他文件不处理。并不会进行打包，只是单纯的处理样式文件。



##  特点

- 当你进行微信小程序进行原生开发，并且喜欢使用`stylus`或`css`进行样式开发时，可以使用这个工具
- 可以将项目下`./a`目录复制到项目下`./b`目录，并对`.css`和`.stylus`进行转换
- 不会对项目中的依赖导入关系进行打包



## 安装

```shell
npm i -D|-g wxss-transform
```



## 使用

```shell
wxss <entry> <output>
```

- `entry`
  - 可选。监听目录或文件。
  - 默认项目下`./src`目录
- `output`
  - 若传入`entry`则为必选，否则可选。输出目录或文件
  - 默认项目下`./dist`文件



## 例

- 本地安装

  - 在`package.json`中设置：

    ```json
    {
      "script": {
    		"dev": "wxss ./src ./dist"
      }
    }
    ```

  - 或

    ```shell
    npx wxss ./src ./dist
    ```

- 全局安装

  - 在项目目录下直接运行

  ```shell
  wxss ./src ./dist
  ```



## 常见问题

1. 当我启动后，试着删除`./src`下的一个空目录或多级空目录时，会报出错误并退出程序

   **解决方案：重新启动工具**

   由于本项目是使用`chokidar`模块进行目录/文件监听的，这个问题是`chokidar`一直没有解决掉的Bug。

   所以，如果想对此Bug进行修复的各位，可以参考这个`chokidar`的一个Issues：

   <https://github.com/paulmillr/chokidar/issues/566>