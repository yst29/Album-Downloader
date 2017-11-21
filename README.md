# Album-Downloader

A tool for easily downloading photos from album websites in Taiwan, built with [NW.js (node-webkit)](https://nwjs.io)
![Screenshot](http://www2.cs.ccu.edu.tw/~yst98u/job/Album_Downloader.png)
### Demo
[Link of demo video](http://www2.cs.ccu.edu.tw/~yst98u/job/Album_Downloader_Demo.mp4)
### Features
* It can add new download task to queue anytime.
* it speed up download speed of images by multiprocessing.
### Execution
* Method 1: Download [NW.js](https://nwjs.io) binary and run:
```
$ /path/to/nw <source directory>
```
* Method 2: use [nwjs-builder-phoenix](https://github.com/evshiron/nwjs-builder-phoenix) to package a execution file
### Development Skills Used
* Use [Node.js](https://nodejs.org/en/) + [NW.js (node-webkit)](https://nwjs.io) for GUI application, [Bootstrap](https://getbootstrap.com/docs/3.3/) for front-end design.
* Use [queue](https://www.npmjs.com/package/queue) to implement task queue for achieving downloads speed-up.
* Implement javascript OOP for cleaner code structure.